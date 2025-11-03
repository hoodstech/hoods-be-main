/**
 * Get the start of a specific date (midnight) in local timezone
 */
export function getStartOfDay(date: Date): Date {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  return startOfDay
}

/**
 * Get the start of today (midnight) in local timezone
 */
export function getStartOfToday(): Date {
  return getStartOfDay(new Date())
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}
