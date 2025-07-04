/**
 * Date utility functions for consistent date handling across the application
 * These functions avoid timezone conversion issues by working directly with ISO date strings
 */

/**
 * Convert ISO date string to DD/MM/YYYY format for display
 * @param isoDate - ISO date string (e.g., "2023-12-25T00:00:00.000Z")
 * @returns Date in DD/MM/YYYY format
 */
export const formatDateForDisplay = (isoDate: string): string => {
  // Extract the date part (YYYY-MM-DD) from the ISO string to avoid timezone offset
  const datePart = isoDate.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Convert DD/MM/YYYY format back to ISO date string
 * @param displayDate - Date in DD/MM/YYYY format (e.g., "25/12/2023")
 * @returns ISO date string
 */
export const parseDateFromDisplay = (displayDate: string): string => {
  const [day, month, year] = displayDate.split('/');
  // Create the ISO date string directly without timezone conversion
  // Format: YYYY-MM-DDTHH:mm:ss.sssZ
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
  return isoDate;
};

/**
 * Get today's date in DD/MM/YYYY format
 * @returns Today's date in DD/MM/YYYY format
 */
export const getTodayDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Validate if a date string is in DD/MM/YYYY format
 * @param dateString - Date string to validate
 * @returns True if valid DD/MM/YYYY format
 */
export const isValidDateFormat = (dateString: string): boolean => {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;
  
  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getDate() === day && 
         date.getMonth() === month - 1 && 
         date.getFullYear() === year;
}; 