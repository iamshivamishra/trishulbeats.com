"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

function FormField({
  label,
  htmlFor,
  description,
  error,
  required,
  optional,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1.5 text-sm font-medium leading-none text-foreground"
        >
          {label}
          {required && (
            <span className="text-destructive/70 text-xs">*</span>
          )}
          {optional && (
            <span className="text-muted-foreground/60 text-xs font-normal">
              (optional)
            </span>
          )}
        </label>
      )}
      {description && (
        <p className="text-[13px] leading-snug text-muted-foreground">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="text-[13px] text-destructive flex items-center gap-1">
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
