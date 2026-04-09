// components/ui/card.tsx
import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}
