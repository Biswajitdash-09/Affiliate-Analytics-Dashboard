"use client";

import React from "react";

const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = "No data available",
  onRowClick,
  className = "",
}) => {
  return (
    <div className={`overflow-x-auto bg-base-100 rounded-box shadow-sm border border-base-200 ${className}`}>
      <table className="table table-zebra w-full">
        {/* Table Head */}
        <thead className="bg-base-200/50 text-base-content font-semibold">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={col.className || ""}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {isLoading ? (
            // Loading Skeleton
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={`skeleton-${idx}`} className="animate-pulse">
                {columns.map((_, colIdx) => (
                  <td key={colIdx}>
                    <div className="h-4 bg-base-300 rounded w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length > 0 ? (
            // Data Rows
            data.map((row, rowIndex) => (
              <tr
                key={row._id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`hover:bg-base-200/50 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`} className={col.className || ""}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            // Empty State
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-base-content/60">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;