import React from 'react';

export const AuraLogo = ({ size = 28, className = "" }: { size?: number, className?: string }) => (
  <img 
    src="/favicon.ico" 
    alt="Aura IDE Logo" 
    width={size} 
    height={size} 
    className={`object-contain ${className}`}
  />
);
