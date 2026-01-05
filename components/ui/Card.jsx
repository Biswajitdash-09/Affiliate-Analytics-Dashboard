"use client";

import React from "react";

const Card = ({
  title,
  children,
  actions,
  className = "",
  compact = false,
  bordered = false,
  image,
  imageAlt = "Card image",
}) => {
  return (
    <div
      className={`card bg-base-100 shadow-xl ${compact ? "card-compact" : ""} ${
        bordered ? "card-bordered" : ""
      } ${className}`}
    >
      {image && (
        <figure>
          <img src={image} alt={imageAlt} className="w-full object-cover" />
        </figure>
      )}
      <div className="card-body">
        {title && <h2 className="card-title">{title}</h2>}
        <div className="text-base-content/80">{children}</div>
        {actions && <div className="card-actions justify-end mt-4">{actions}</div>}
      </div>
    </div>
  );
};

export default Card;