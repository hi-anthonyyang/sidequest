import React from 'react';

const InfoIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="7.25" y="7" width="1.5" height="4" rx="0.75" fill="currentColor" />
    <rect x="7.25" y="4" width="1.5" height="1.5" rx="0.75" fill="currentColor" />
  </svg>
);

export default InfoIcon; 