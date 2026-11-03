import { useEffect, useState } from "react";

interface State<T> {
  data?: T;
  error?: Error;
  loading: boolean;
}

// Loads data when the component mounts or `deps` change. Small on purpose -
// if caching or refetching becomes important, swap this for TanStack Query.
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): State<T> {
  const [state, setState] = useState<State<T>>({ loading: true });

  useEffect(() => {
    let cancelled = false; // ignore a slow response if the user has already moved on
    setState({ loading: true });
    load()
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error: Error) => !cancelled && setState({ error, loading: false }));
    return () => {
      cancelled = true;
    };
  }, deps); // caller passes the values `load` depends on, e.g. [slug]

  return state;
}
