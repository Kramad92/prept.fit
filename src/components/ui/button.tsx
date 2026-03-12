"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default:
          "bg-brand-500 text-brand-950 hover:bg-brand-600",
        outline:
          "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        ghost:
          "hover:bg-gray-100 text-gray-700",
        link:
          "text-brand-600 underline-offset-4 hover:underline focus:ring-0 focus:ring-offset-0",
      },
      size: {
        default: "px-4 py-2.5",
        sm: "px-3 py-1.5 text-xs",
        lg: "px-6 py-3",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
