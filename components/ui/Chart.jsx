"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * Custom Tooltip component for the chart
 * Adapts to the DaisyUI theme using base-100 and base-content colors
 */
const CustomTooltip = ({ active, payload, label, valueFormatter }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const formattedValue = valueFormatter ? valueFormatter(value) : value;
    const name = payload[0].name;

    return (
      <div className="bg-base-100 border border-base-200 p-3 rounded-lg shadow-xl text-sm z-50">
        <p className="font-bold text-base-content mb-1 opacity-70">{label}</p>
        <div className="flex items-center gap-2">
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: payload[0].color }}
          ></span>
          <p className="font-medium text-base-content">
            <span className="capitalize">{name}:</span> {formattedValue}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Reusable Chart Component
 * Wraps Recharts to provide consistent styling and behavior across the app.
 * 
 * @param {Array} data - Array of data objects
 * @param {string} type - 'area' or 'bar'
 * @param {string} dataKey - The key in data objects to visualize (e.g., 'clicks', 'revenue')
 * @param {string} xAxisKey - The key for X-axis labels (default: 'date')
 * @param {string} color - Hex color code for the chart elements
 * @param {number} height - Height of the chart container in pixels
 * @param {function} valueFormatter - Optional function to format values (e.g., currency)
 */
const Chart = ({
  data = [],
  type = "area",
  dataKey = "value",
  xAxisKey = "date",
  color = "#4f46e5", // Default primary color
  height = 300,
  valueFormatter,
  className = "",
}) => {
  // Handle empty state
  if (!data || data.length === 0) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-base-200/30 rounded-xl border border-dashed border-base-300 ${className}`}
        style={{ height }}
      >
        <div className="opacity-20 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
        </div>
        <p className="text-base-content/40 text-sm font-medium">No data available</p>
      </div>
    );
  }

  const ChartComponent = type === "bar" ? BarChart : AreaChart;

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`colorGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="currentColor" 
            className="text-base-300/40" 
          />
          
          <XAxis 
            dataKey={xAxisKey} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'currentColor', fontSize: 11 }} 
            className="text-base-content/50"
            dy={10}
            minTickGap={30}
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'currentColor', fontSize: 11 }} 
            className="text-base-content/50"
            tickFormatter={valueFormatter}
          />
          
          <Tooltip 
            content={<CustomTooltip valueFormatter={valueFormatter} />} 
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} 
          />
          
          {type === "bar" ? (
            <Bar 
              dataKey={dataKey} 
              fill={color} 
              radius={[4, 4, 0, 0]} 
              barSize={40}
              animationDuration={1000}
            />
          ) : (
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#colorGradient-${dataKey})`}
              animationDuration={1000}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export default Chart;