/**
 * ScanInputHandler Utility
 * Detects high-speed input from USB barcode scanners.
 */
export const ScanInputHandler = {
    /**
     * Evaluates if a buffer and its timing constitute a scan.
     * @param {string} buffer - Collected characters.
     * @param {number} startTime - Timestamp of first keydown.
     * @param {number} endTime - Timestamp of Enter keydown.
     * @returns {boolean}
     */
    isScan: (buffer, startTime, endTime) => {
        if (!buffer || buffer.length === 0) return false;
        const duration = endTime - startTime;
        // User Threshold: < 200ms total for the whole code.
        return duration < 200;
    }
};
