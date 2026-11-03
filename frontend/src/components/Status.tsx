import { ReactNode } from "react";

interface Props<T> {
  state: { data?: T; error?: Error; loading: boolean };
  children: (data: T) => ReactNode;
}

// Shows a loading or error message, otherwise renders children with the data.
// Keeps every page's loading/error handling consistent.
export function Status<T>({ state, children }: Props<T>) {
  if (state.loading) return <p className="muted">Loading…</p>;
  if (state.error || state.data === undefined) {
    return (
      <p role="alert" className="error">
        {state.error?.message ?? "Something went wrong"}
      </p>
    );
  }
  return <>{children(state.data)}</>;
}
