import React from 'react';

const CopyIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

export default CopyIcon; 