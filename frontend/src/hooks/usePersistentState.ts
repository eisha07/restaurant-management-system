import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for state that persists to localStorage
 * @param key - localStorage key
 * @param defaultValue - default value if not found in storage
 * @param storage - storage object (localStorage or sessionStorage)
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  storage: Storage = localStorage
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
    }
    return defaultValue;
  });

  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState((prevState) => {
      const nextState = typeof value === 'function' 
        ? (value as (prev: T) => T)(prevState) 
        : value;
      
      try {
        storage.setItem(key, JSON.stringify(nextState));
      } catch (error) {
        console.error(`Error writing ${key} to storage:`, error);
      }
      
      return nextState;
    });
  }, [key, storage]);

  return [state, setPersistentState];
}

/**
 * Hook for persisting state on page visibility changes
 */
export function usePageVisibility(onHide?: () => void, onShow?: () => void) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHide?.();
      } else {
        onShow?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onHide, onShow]);
}

/**
 * Hook for saving state before page unload
 */
export function useBeforeUnload(callback: () => void) {
  useEffect(() => {
    const handleBeforeUnload = () => {
      callback();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [callback]);
}
