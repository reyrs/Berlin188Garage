import React from 'react';

/**
 * Brand guideline: accent shapes must be a ring, circle, or curved line — never straight.
 * Replaces straight border-b-2 underlines used as active-tab indicators.
 */
export default function CurveAccent({ active, className = 'text-berlin-red' }: { active: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      className={`absolute left-0 right-0 bottom-0 w-full h-2 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      <path d="M2,2 Q50,8 98,2" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
