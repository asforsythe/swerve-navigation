import { useState, useEffect } from 'react';

/**
 * Debounces a value by the specified delay.
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounces a callback function.
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} The debounced callback
 */
export function useDebouncedCallback(callback, delay = 300) {
    const [timeoutId, setTimeoutId] = useState(null);

    const debouncedCallback = (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        const id = setTimeout(() => callback(...args), delay);
        setTimeoutId(id);
    };

    useEffect(() => () => {
        if (timeoutId) clearTimeout(timeoutId);
    }, [timeoutId]);

    return debouncedCallback;
}
