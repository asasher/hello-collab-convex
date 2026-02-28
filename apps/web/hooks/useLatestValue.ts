import { useCallback, useMemo, useRef } from "react";

// Based on convex-helpers/src/hooks/useLatestValue.ts.
export default function useLatestValue<T>() {
  const initial = useMemo(() => {
    const [promise, resolve] = makeSignal();
    return { data: undefined as T, promise, resolve };
  }, []);

  const ref = useRef(initial);

  const nextValue = useCallback(async () => {
    await ref.current.promise;
    const [promise, resolve] = makeSignal();
    ref.current.promise = promise;
    ref.current.resolve = resolve;
    return ref.current.data;
  }, []);

  const updateValue = useCallback((data: T) => {
    ref.current.data = data;
    ref.current.resolve();
  }, []);

  return [nextValue, updateValue] as const;
}

const makeSignal = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return [promise, resolve] as const;
};
