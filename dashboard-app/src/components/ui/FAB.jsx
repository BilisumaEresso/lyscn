import React from 'react';

export default function FAB({ onClick, ariaLabel = 'Primary action', children, className = '' }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={"lg:hidden fixed right-4 z-50 rounded-full flex items-center justify-center shadow-lg text-white " + className}
      style={{
        width: '56px',
        height: '56px',
        // Sit above the bottom tab bar: account for safe-area-inset-bottom
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
      }}
    >
      {children}
    </button>
  );
}
