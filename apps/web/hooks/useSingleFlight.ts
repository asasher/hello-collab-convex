import { useCallback, useRef } from "react";

// Based on convex-helpers/src/hooks/useSingleFlight.ts.
export default function useSingleFlight<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
) {
  const flightStatus = useRef({
    inFlight: false,
    upNext: null as null | {
      fn: (...args: Args) => Promise<R>;
      resolve: (value: R | PromiseLike<R>) => void;
      reject: (reason?: unknown) => void;
      args: Args;
    },
  });

  return useCallback(
    (...args: Args): Promise<R> => {
      if (flightStatus.current.inFlight) {
        return new Promise((resolve, reject) => {
          flightStatus.current.upNext = { fn, resolve, reject, args };
        }) as Promise<R>;
      }

      flightStatus.current.inFlight = true;
      const firstRequest = fn(...args);

      void (async () => {
        try {
          await firstRequest;
        } finally {
          // Continue with latest queued request even if this one failed.
        }
        while (flightStatus.current.upNext) {
          const current = flightStatus.current.upNext;
          flightStatus.current.upNext = null;
          await current
            .fn(...current.args)
            .then(current.resolve)
            .catch(current.reject);
        }
        flightStatus.current.inFlight = false;
      })();

      return firstRequest;
    },
    [fn],
  );
}
