"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const SignupPage = () => {
  const router = useRouter();
  const { register, verifyEmail, login } = useAuth();

  const [step, setStep] = useState(1); // 1: Register, 2: Verify OTP
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Prepare data for API (exclude confirmPassword and otp)
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };

      const result = await register(userData);

      if (result.success && result.requiresVerification) {
        setStep(2); // Move to OTP step
      } else if (result.success) {
        // Should not happen with new flow, but fallback
        router.push("/dashboard");
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!formData.otp) {
      setError("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await verifyEmail(formData.email, formData.otp);

      if (result.success) {
        // Attempt auto-login
        const loginResult = await login(formData.email, formData.password);
        if (loginResult.success) {
          router.push("/dashboard");
        } else {
          // If auto-login fails, redirect to login page
          router.push("/login?verified=true");
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 text-secondary mb-4">
            <Icon name={step === 1 ? "UserPlus" : "ShieldCheck"} size={32} />
          </div>
          <h1 className="text-3xl font-bold text-base-content">
            {step === 1 ? "Create Account" : "Verify Email"}
          </h1>
          <p className="text-base-content/60 mt-2">
            {step === 1 ? "Join our affiliate network today" : `Enter the code sent to ${formData.email}`}
          </p>
        </div>

        <Card className="border-t-4 border-t-secondary">
          {error && (
            <div className="alert alert-error text-sm py-2 rounded-md mb-4">
              <Icon name="AlertCircle" size={18} />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-bold text-lg btn-secondary"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Create Account
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Verification Code</span>
                </label>
                <input
                  type="text"
                  name="otp"
                  placeholder="123456"
                  className="input input-bordered w-full text-center text-2xl tracking-[0.5em] font-mono"
                  value={formData.otp}
                  onChange={(e) => {
                    // Allow only numbers and limit to 6 chars
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setFormData(prev => ({ ...prev, otp: val }));
                    if (error) setError("");
                  }}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Check your email inbox and spam folder
                  </span>
                </label>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-bold text-lg btn-secondary"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Verify & Login
                </Button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-ghost btn-sm w-full mt-2"
                  disabled={isLoading}
                >
                  Change Email
                </button>
              </div>
            </form>
          )}

          <div className="divider my-6">OR</div>

          <div className="text-center text-sm">
            <span className="text-base-content/70">Already have an account? </span>
            <Link href="/login" className="link link-secondary font-semibold hover:link-primary transition-colors">
              Sign in here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;