import { useEffect, useState, useCallback, useRef } from 'react';

interface UseLiveDataOptions {
  interval?: number; // Refresh interval in ms
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function useLiveData<T>(
  fetchFn: () => Promise<T>,
  options: UseLiveDataOptions = {}
) {
  const { interval = 0, enabled = true, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, onError]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refetch();
    }
  }, [enabled, refetch]);

  // Set up polling if interval is specified
  useEffect(() => {
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        refetch();
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enabled, interval, refetch]);

  return { data, loading, error, refetch };
}

export function useDebouncedCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return ((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return new Promise((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await callback(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }) as T;
}

/**
 * Optimistic update helper for real-time UI feedback
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState(initialData);
  const [isUpdating, setIsUpdating] = useState(false);

  const performUpdate = useCallback(
    async (optimisticData: T) => {
      const previousData = data;
      setData(optimisticData);
      setIsUpdating(true);

      try {
        const result = await updateFn(optimisticData);
        setData(result);
      } catch (error) {
        // Revert on error
        setData(previousData);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [data, updateFn]
  );

  return { data, isUpdating, performUpdate };
}
