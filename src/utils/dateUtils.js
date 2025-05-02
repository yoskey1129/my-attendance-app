/**
 * Formats a Date object or timestamp into HH:MM:SS string.
 * @param {Date | number | null} date - The date or timestamp to format.
 * @returns {string} Formatted time string or '--:--:--' if invalid.
 */
export function formatTime(date) {
  if (!date) return '--:--:--';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '--:--:--';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a duration in milliseconds into HH:MM:SS string.
 * @param {number} durationMs - Duration in milliseconds.
 * @returns {string} Formatted duration string.
 */
export function formatDuration(durationMs) {
  if (durationMs < 0) durationMs = 0;
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Gets the current date as a YYYY-MM-DD string.
 * @returns {string} Formatted date string.
 */
export function getCurrentDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
