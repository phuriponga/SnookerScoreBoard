'use client'

import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export function Button({ className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${className}`}
      {...props}
    />
  )
}
