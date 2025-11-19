"use client";

import { forwardRef, TextareaHTMLAttributes, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className = '', id, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const hasError = !!error;

    const textareaStyles = hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-gray-300 focus:border-blue-600 focus:ring-blue-100";

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${textareaId}-error` : undefined}
          className={`w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400 transition-colors focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed resize-y ${textareaStyles} ${className}`}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
