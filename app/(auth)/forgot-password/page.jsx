"use client";

import React, { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (data.success) {
                setIsSuccess(true);
            } else {
                setError(data.error || "Something went wrong");
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                        <Icon name="Key" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-base-content">Forgot Password?</h1>
                    <p className="text-base-content/60 mt-2">No worries, we'll send you reset instructions.</p>
                </div>

                <Card className="border-t-4 border-t-primary">
                    {!isSuccess ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isSubmitting}
                                className="w-full"
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full font-bold text-lg"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Send Reset Link
                            </Button>

                            <div className="text-center">
                                <Link href="/login" className="link link-hover text-sm text-base-content/70 flex items-center justify-center gap-1">
                                    <Icon name="ArrowLeft" size={14} />
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                                <Icon name="Check" size={32} />
                            </div>
                            <h3 className="text-xl font-bold">Check your email</h3>
                            <p className="text-base-content/70 text-sm">
                                We sent a password reset link to <strong>{email}</strong>.
                                <br />
                                Please check your inbox (and spam folder).
                            </p>

                            <div className="pt-4">
                                <Link href="/login" className="btn btn-outline btn-block">
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
