import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  children,
  padding = 'md',
  hover = false,
  clickable = false,
  onClick,
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
  const isInteractive = clickable && onClick;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`rounded-xl bg-white border border-gray-200 shadow-sm ${paddings[padding]} ${hoverEffect} ${cursorStyle} ${className}`}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {children}
    </div>
  );
}
