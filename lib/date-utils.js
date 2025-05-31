/**
 * Formats a date string (YYYY-MM-DD) into a human-readable format
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  if (!dateString) return ""

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Formats event time range for display, handling overnight events properly
 * @param {Object} event - Event object with time information
 * @returns {string} Formatted time range
 */
export function formatEventTimeRange(event) {
  if (!event.startTime || !event.endTime) return ""
  
  // If this is an overnight event part, show the original full time range for both parts
  if (event.isOvernightPart === "start" || event.isOvernightPart === "end") {
    // Both parts show the original full time range
    return formatTimeRange(event.originalStartTime, event.originalEndTime)
  } else {
    // Regular event
    return formatTimeRange(event.startTime, event.endTime)
  }
}

/**
 * Formats a time range for display
 * @param {string} startTime - Start time in 12h format (e.g., "10:00 AM")
 * @param {string} endTime - End time in 12h format (e.g., "11:30 AM")
 * @returns {string} Formatted time range
 */
export function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return ""

  const formatShort = (time) => {
    if (!time) return ""
    const [timePart, period] = time.split(" ")
    const [hours, minutes] = timePart.split(":")
    return `${hours}:${minutes} ${period}`
  }

  return `${formatShort(startTime)} - ${formatShort(endTime)}`
}

/**
 * Converts time to total minutes from midnight
 * @param {string} time12h - Time in 12h format (e.g., "10:00 AM")
 * @returns {number} Minutes from midnight
 */
export function timeToMinutes(time12h) {
  if (!time12h) return 0
  const [timePart, period] = time12h.split(" ")
  let [hours, minutes] = timePart.split(":")
  hours = Number.parseInt(hours, 10)
  minutes = Number.parseInt(minutes, 10)

  if (hours === 12) {
    hours = period === "PM" ? 12 : 0
  } else if (period === "PM") {
    hours += 12
  }

  return hours * 60 + minutes
}
