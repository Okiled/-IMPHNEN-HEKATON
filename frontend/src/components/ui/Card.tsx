"use client";

import React from 'react';
import { useTheme } from '@/lib/theme-context';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    const { theme } = useTheme();
    return (
        <div 
        className={`rounded-xl border shadow-sm transition-all duration-300 ${
            theme === "dark" 
                ? "border-gray-700 bg-gray-800/50 text-gray-100 hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)] hover:border-gray-600" 
                : "border-border bg-white text-black hover:shadow-md"
        } ${className}`} 
        {...props}
        >
        {children}
        </div>
    );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`flex flex-col space-y-1.5 p-6 pb-2 ${className}`} {...props}>
        {children}
        </div>
    );
};

export const CardContent: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`p-6 pt-2 ${className}`} {...props}>
        {children}
        </div>
    );
};

export const CardTitle: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
        {children}
        </h3>
    );
};
