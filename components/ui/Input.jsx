"use client";

import React from "react";

const Input = ({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  error,
  name,
  className = "",
  disabled = false,
  required = false,
  ...props
}) => {
  return (
    <div className={`form-control w-full ${className}`}>
      {label && (
        <div className="label">
          <span className={`label-text font-medium ${error ? "text-error" : ""}`}>
            {label} {required && <span className="text-error">*</span>}
          </span>
        </div>
      )}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`input input-bordered w-full transition-all duration-200 focus:ring-2 focus:ring-primary/20 ${
          error ? "input-error" : ""
        }`}
        {...props}
      />
      {error && (
        <div className="label">
          <span className="label-text-alt text-error">{error}</span>
        </div>
      )}
    </div>
  );
};

export default Input;