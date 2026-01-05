"use client";

import * as LucideIcons from "lucide-react";

const Icon = ({ name, size = 24, className = "" }) => {
  // Retrieve the icon component from the LucideIcons object
  // Fallback to HelpCircle if the icon name is invalid or not found
  const IconComponent = LucideIcons[name] || LucideIcons.HelpCircle;

  return <IconComponent size={size} className={className} />;
};

export default Icon;