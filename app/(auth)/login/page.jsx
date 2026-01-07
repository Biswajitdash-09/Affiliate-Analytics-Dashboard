"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const LoginPage = () => {
  const router = useRouter();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Icon name="LogIn" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-base-content">Welcome Back</h1>
          <p className="text-base-content/60 mt-2">Sign in to access your dashboard</p>
        </div>

        <Card className="border-t-4 border-t-primary">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="alert alert-error text-sm py-2 rounded-md">
                <Icon name="AlertCircle" size={18} />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full"
            />

            <div className="form-control w-full">
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full"
              />
              <label className="label">
                <span className="label-text-alt"></span>
                <Link href="/forgot-password" className="label-text-alt link link-primary hover:link-accent">
                  Forgot password?
                </Link>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full font-bold text-lg"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Sign In
              </Button>
            </div>
          </form>

          <div className="divider my-6">OR</div>

          <div className="text-center text-sm">
            <span className="text-base-content/70">Don't have an account? </span>
            <Link href="/signup" className="link link-primary font-semibold hover:link-accent transition-colors">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;