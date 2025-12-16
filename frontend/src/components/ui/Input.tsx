"use client";

import React from 'react';
import { useTheme } from '@/lib/theme-context';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
label?: string;
error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, ...props }, ref) => {
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

            <input
            type={type}
            className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors 
                file:border-0 file:bg-transparent file:text-sm file:font-medium 
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 
                ${theme === "dark" 
                    ? "bg-gray-800 text-gray-100 placeholder:text-gray-500 focus-visible:ring-offset-gray-900" 
                    : "bg-white text-black placeholder:text-gray-400"
                }
                ${
                error 
                    ? 'border-danger focus-visible:ring-danger' 
                    : theme === "dark"
                        ? 'border-gray-700 focus-visible:ring-primary'
                        : 'border-border focus-visible:ring-primary' 
                }
                ${className}`}
            ref={ref}
            {...props}
            />
            {error && (
            <p className="mt-1 text-xs text-danger font-medium">{error}</p>
            )}
        </div>
        );
    }
);
Input.displayName = "Input";