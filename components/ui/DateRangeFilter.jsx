"use client";

import React, { useState } from "react";
import Icon from "@/components/Icon";

/**
 * DateRangeFilter Component
 * Provides a dropdown to select predefined date ranges.
 * Calculates start and end dates and passes them to the parent component.
 * 
 * @param {function} onRangeChange - Callback function receiving { startDate, endDate, range }
 * @param {string} className - Additional CSS classes
 */
const DateRangeFilter = ({ onRangeChange, className = "" }) => {
  const [selectedRange, setSelectedRange] = useState("30d");

  const ranges = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];

  const calculateDateRange = (rangeValue) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (rangeValue) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "month":
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case "all":
        // Set to a far past date to encompass all data
        startDate = new Date(2020, 0, 1); 
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Normalize times to start and end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      range: rangeValue
    };
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedRange(value);
    
    if (onRangeChange) {
      onRangeChange(calculateDateRange(value));
    }
  };

  return (
    <div className={`form-control ${className}`}>
      <div className="relative">
        <select 
          className="select select-bordered select-sm w-full max-w-xs pl-9 pr-8 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-base-100 shadow-sm"
          value={selectedRange}
          onChange={handleChange}
          aria-label="Select date range"
        >
          {ranges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none">
          <Icon name="Calendar" size={14} />
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 pointer-events-none">
          <Icon name="ChevronDown" size={12} />
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilter;