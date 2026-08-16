import * as React from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps extends React.ComponentProps<"fieldset"> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function FormSection({
  title,
  description,
  icon,
  className,
  children,
  ...props
}: FormSectionProps) {
  return (
    <fieldset
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <div className="border-b border-border/40 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
              {icon}
            </span>
          )}
          <div>
            <legend className="text-sm font-semibold text-foreground">
              {title}
            </legend>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </fieldset>
  );
}

export { FormSection };
