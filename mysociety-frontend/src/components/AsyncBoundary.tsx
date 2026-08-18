import type { ReactNode } from 'react';

interface AsyncBoundaryProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}

export function AsyncBoundary({ loading, error, onRetry, children }: AsyncBoundaryProps) {
  if (loading) {
    return (
      <p className="state" role="status">
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <div className="state state--error" role="alert">
        <p>{error}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
