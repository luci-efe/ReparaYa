"use client";

import { forwardRef, InputHTMLAttributes, useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    const hasError = !!error;

    return (
      <div className="w-full">
        <div className="flex items-center gap-3">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            aria-invalid={hasError}
            aria-describedby={hasError ? `${checkboxId}-error` : undefined}
            className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className="text-sm font-medium text-gray-700 cursor-pointer select-none"
          >
            {label}
          </label>
        </div>
        {error && (
          <p id={`${checkboxId}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
