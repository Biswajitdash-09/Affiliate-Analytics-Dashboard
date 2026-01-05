"use client";

import React, { useEffect, useRef } from "react";
import Icon from "@/components/Icon";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = "md", // sm, md, lg, w-11/12 max-w-5xl
  className = "",
}) => {
  const modalRef = useRef(null);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Map sizes to DaisyUI/Tailwind classes
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "w-11/12 max-w-5xl",
  };

  return (
    <div className="modal modal-open modal-bottom sm:modal-middle z-50">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div
        ref={modalRef}
        className={`modal-box relative ${sizeClasses[size] || "max-w-md"} ${className} animate-in fade-in zoom-in-95 duration-200`}
      >
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          aria-label="Close modal"
        >
          <Icon name="X" size={20} />
        </button>
        
        {title && <h3 className="font-bold text-lg mb-4 pr-8">{title}</h3>}
        
        <div className="py-2">{children}</div>
        
        {actions && <div className="modal-action mt-6">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;