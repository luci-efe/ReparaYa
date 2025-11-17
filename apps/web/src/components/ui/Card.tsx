import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
  className?: string;
}

export function Card({
  children,
  padding = 'md',
  hover = false,
  clickable = false,
  className = ''
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverEffect = hover ? 'hover:shadow-md transition-shadow' : '';
  const cursorStyle = clickable ? 'cursor-pointer' : '';

  return (
    <div className={`rounded-xl bg-white border border-gray-200 shadow-sm ${paddings[padding]} ${hoverEffect} ${cursorStyle} ${className}`}>
      {children}
    </div>
  );
}
