import { useEffect, useRef } from 'react';
import { ScanInputHandler } from '../utils/ScanInputHandler';

/**
 * Custom hook to detect scanner input globally or locally.
 * @param {Object} options - Configuration options.
 * @param {Function} options.onScanDetected - Callback when a scan is confirmed.
 */
export function useScanDetection({ onScanDetected }) {
    const buffer = useRef('');
    const firstKeyTime = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const now = Date.now();

            if (e.key === 'Enter') {
                const startTime = firstKeyTime.current;
                const code = buffer.current;

                if (ScanInputHandler.isScan(code, startTime, now)) {
                    onScanDetected(code);
                    // Optional: Clear any focused input if desired, or let caller handle it.
                }

                // Reset buffer regardless
                buffer.current = '';
                firstKeyTime.current = 0;
                return;
            }

            // Ignore modifiers
            if (e.key.length > 1) return;

            if (firstKeyTime.current === 0) {
                firstKeyTime.current = now;
            }

            buffer.current += e.key;

            // Safety: if buffer exists but time since start > 1 second, it's definitely manual typing
            if (now - firstKeyTime.current > 1000) {
                // We don't necessarily clear it, but it will fail the isScan check on Enter.
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onScanDetected]);
}
