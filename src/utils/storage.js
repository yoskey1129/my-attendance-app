const STORAGE_KEY = 'attendanceLog';

/**
 * Loads the attendance log from local storage.
 * @returns {Array} The parsed attendance log array or an empty array if not found/invalid.
 */
export function loadAttendanceLog() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsedData = JSON.parse(data);
      // Basic validation: check if it's an array
      return Array.isArray(parsedData) ? parsedData : [];
    }
  } catch (error) {
    console.error('Error loading attendance log from local storage:', error);
  }
  return [];
}

/**
 * Saves the attendance log to local storage.
 * @param {Array} logData - The attendance log array to save.
 */
export function saveAttendanceLog(logData) {
  try {
    if (!Array.isArray(logData)) {
      throw new Error('Invalid data type: Expected an array.');
    }
    const dataToSave = JSON.stringify(logData);
    localStorage.setItem(STORAGE_KEY, dataToSave);
  } catch (error) {
    console.error('Error saving attendance log to local storage:', error);
  }
}

/**
 * Finds today's record in the log.
 * @param {Array} logData - The attendance log array.
 * @param {string} todayDateString - Today's date in YYYY-MM-DD format.
 * @returns {object | null} Today's record object or null if not found.
 */
export function findTodayRecord(logData, todayDateString) {
    return logData.find(record => record.date === todayDateString) || null;
}

/**
 * Updates or adds today's record in the log.
 * @param {Array} logData - The attendance log array (will be modified).
 * @param {object} todayRecord - The record object for today.
 */
export function upsertTodayRecord(logData, todayRecord) {
    const todayIndex = logData.findIndex(record => record.date === todayRecord.date);
    if (todayIndex > -1) {
        // Update existing record
        logData[todayIndex] = todayRecord;
    } else {
        // Add new record
        logData.push(todayRecord);
    }
}
