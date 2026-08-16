"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputGroupProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

function InputGroup({ className, children, ...props }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "relative flex items-center rounded-lg border border-input bg-background transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        "[&_input]:border-0 [&_input]:bg-transparent [&_input]:ring-0 [&_input]:focus-visible:border-transparent [&_input]:focus-visible:ring-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface InputPrefixProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

function InputPrefix({ className, children, ...props }: InputPrefixProps) {
  return (
    <div
      data-slot="input-prefix"
      className={cn(
        "pointer-events-none flex items-center pl-3 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface InputSuffixProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

function InputSuffix({ className, children, ...props }: InputSuffixProps) {
  return (
    <div
      data-slot="input-suffix"
      className={cn(
        "pointer-events-none flex items-center pr-3 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface InputAddonProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
  position?: "left" | "right";
}

function InputAddon({
  className,
  children,
  position = "left",
  ...props
}: InputAddonProps) {
  return (
    <div
      data-slot="input-addon"
      className={cn(
        "flex items-center bg-muted/50 px-3 text-sm text-muted-foreground select-none",
        position === "left" && "rounded-l-lg border-r border-input",
        position === "right" && "rounded-r-lg border-l border-input",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { InputGroup, InputPrefix, InputSuffix, InputAddon };
