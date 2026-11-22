'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

export type IconName = string;

interface AppIconProps {
  name: IconName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
  stroke?: number;
  color?: string;
  fill?: string;
  style?: React.CSSProperties;
}

export function AppIcon({ 
  name, 
  size = 'sm', 
  className = '', 
  stroke = 1.75,
  color,
  fill,
  style
}: AppIconProps) {
  const IconComponent = (LucideIcons as any)[name] as React.ComponentType<any>;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  // Size mapping matching Vercel/Linear spacing
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
  };

  const computedSize = typeof size === 'number' ? size : sizeMap[size] || 16;

  return (
    <IconComponent
      className={className}
      size={computedSize}
      strokeWidth={stroke}
      color={color}
      fill={fill}
      style={style}
    />
  );
}
