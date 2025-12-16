"use client";

import React from 'react';
import { useTheme } from '@/lib/theme-context';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, ...props }, ref) => {
    const { theme } = useTheme();
    
    return (
      <div className="w-full">
        {label && (
          <label className={`mb-1.5 block text-xs font-semibold ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            className={`flex h-10 w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm shadow-sm transition-colors 
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
            ${theme === "dark" 
              ? "bg-gray-800 text-gray-100 border-gray-700 focus-visible:ring-offset-gray-900" 
              : "bg-white text-black border-border"
            }
            ${error ? 'border-danger focus-visible:ring-danger' : 'focus-visible:ring-primary'}
            ${className}`}
            ref={ref}
            {...props}
          >
            <option value="" disabled className={theme === "dark" ? "bg-gray-800" : ""}>Pilih satuan...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className={theme === "dark" ? "bg-gray-800" : ""}>
                {option.label}
              </option>
            ))}
          </select>
          <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-danger font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";