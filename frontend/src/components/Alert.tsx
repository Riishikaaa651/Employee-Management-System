import type { ReactNode } from 'react';

interface AlertProps {
  variant: 'error' | 'success' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
}

export function Alert({ variant, children, onDismiss }: AlertProps) {
  // Errors interrupt screen readers immediately; success/info messages wait politely.
  const role = variant === 'error' ? 'alert' : 'status';
  return (
    <div className={`alert alert--${variant}`} role={role}>
      <div className="alert__content">{children}</div>
      {onDismiss && (
        <button type="button" className="alert__dismiss" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  );
}
