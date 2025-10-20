import React from 'react';

interface SlabIconProps {
  className?: string;
}

export const SlabIcon: React.FC<SlabIconProps> = ({ className = "" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 42 68"
  width="100%"
  height="100%"
      fill="none"
      className={className}
    >
   <rect width="40" height="66" x="1" y="1" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" rx="3.19"/>
   <path fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" d="M7 17.719h28v43.333H7z"/>
     <path stroke="hsl(var(--primary))" strokeWidth="2" d="M2 12.769h38"/>
    </svg>
  );
};
