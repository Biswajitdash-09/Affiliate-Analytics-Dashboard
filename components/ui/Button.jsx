"use client";

import React from "react";

const Button = ({
  children,
  variant = "primary", // primary, secondary, ghost, outline, error, success
  size = "md", // lg, md, sm, xs
  className = "",
  isLoading = false,
  disabled = false,
  type = "button",
  fullWidth = false,
  onClick,
  ...props
}) => {
  // Map variants to DaisyUI classes
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    outline: "btn-outline",
    error: "btn-error",
    success: "btn-success",
    neutral: "btn-neutral",
  };

  // Map sizes to DaisyUI classes
  const sizeClasses = {
    lg: "btn-lg",
    md: "btn-md",
    sm: "btn-sm",
    xs: "btn-xs",
  };

  return (
    <button
      type={type}
      className={`btn ${variantClasses[variant] || "btn-primary"} ${sizeClasses[size] || "btn-md"
        } ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && <span className="loading loading-spinner"></span>}
      {children}
    </button>
  );
};

export default Button;