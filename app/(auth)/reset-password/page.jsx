"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const ResetPasswordForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing reset token.");
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Missing reset token.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });
            const data = await res.json();

            if (data.success) {
                setIsSuccess(true);
                // Redirect after 3 seconds
                setTimeout(() => {
                    router.push("/login?message=password_reset");
                }, 3000);
            } else {
                setError(data.error || "Failed to reset password. Link may be expired.");
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                    <Icon name="Check" size={32} />
                </div>
                <h3 className="text-xl font-bold">Password Reset!</h3>
                <p className="text-base-content/70 text-sm">
                    Your password has been successfully updated.
                    <br />
                    Redirecting you to login...
                </p>
                <div className="pt-4">
                    <Link href="/login" className="btn btn-primary btn-block">
                        Login Now
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="alert alert-error text-sm py-2 rounded-md">
                    <Icon name="AlertCircle" size={18} />
                    <span>{error}</span>
                </div>
            )}

            <div className="space-y-4">
                <Input
                    label="New Password"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full"
                />

                <Input
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full"
                />
            </div>

            <Button
                type="submit"
                variant="primary"
                className="w-full font-bold text-lg"
                isLoading={isSubmitting}
                disabled={isSubmitting || !token}
            >
                Reset Password
            </Button>

            <div className="text-center">
                <Link href="/login" className="link link-hover text-sm text-base-content/70 flex items-center justify-center gap-1">
                    <Icon name="ArrowLeft" size={14} />
                    Back to Login
                </Link>
            </div>
        </form>
    );
};

const ResetPasswordPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                        <Icon name="Lock" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-base-content">Set New Password</h1>
                    <p className="text-base-content/60 mt-2">Create a strong password for your account.</p>
                </div>

                <Card className="border-t-4 border-t-accent">
                    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </Card>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
