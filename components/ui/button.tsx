'use client'

import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export function Button({ className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`appearance-none bg-blue-600 text-white rounded flex items-center justify-center ${className}`}
      {...props}
    />
  )
}
