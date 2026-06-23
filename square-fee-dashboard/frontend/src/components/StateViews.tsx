// Reusable loading and error state components.

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <div className="h-5 w-5 mr-3 rounded-full border-2 border-slate-300 border-t-brand-500 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
      <div className="font-semibold mb-1">Something went wrong</div>
      <div className="text-sm">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">{message}</div>;
}
