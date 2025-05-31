"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Menu, LogOut, X, Info, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "../../lib/supabase"
import EventForm from "./EventForm"
import EventPreview from "./EventPreview"
import { formatTimeRange, timeToMinutes, formatEventTimeRange } from "../../lib/date-utils"

const timeSlots = [
  "12:00 AM",
  "01:00 AM",
  "02:00 AM",
  "03:00 AM",
  "04:00 AM",
  "05:00 AM",
  "06:00 AM",
  "07:00 AM",
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
  "09:00 PM",
  "10:00 PM",
  "11:00 PM",
]

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const daysOfWeekShort = ["S", "M", "T", "W", "T", "F", "S"]

const eventColors = [
  { name: "Pink", value: "#FFCBE1", light: "#FFF0F8", border: "#FFE1ED", text: "#D1477A" },
  { name: "Green", value: "#D6E5BD", light: "#F0F5E8", border: "#E3EFCF", text: "#7A9B47" },
  { name: "Yellow", value: "#F9E1A8", light: "#FDF5E6", border: "#FCECC4", text: "#C4A854" },
  { name: "Blue", value: "#BCD8EC", light: "#E8F3F9", border: "#D4E8F5", text: "#5A9BBF" },
  { name: "Purple", value: "#DCCCEC", light: "#F1EBFA", border: "#E8DEF5", text: "#8B6FA6" },
  { name: "Peach", value: "#FFDAB4", light: "#FFF5EA", border: "#FFE7D1", text: "#D1945A" },
]

export default function Calendar({ user, onLogout }) {
  const [currentView, setCurrentView] = useState("week")
  const [currentDate, setCurrentDate] = useState(new Date(2025, 5, 3))
  const [events, setEvents] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [previewEvent, setPreviewEvent] = useState(null)
  const [previewPosition, setPreviewPosition] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [tooltipEvent, setTooltipEvent] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState(null)
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState(null)

  // Load user's events from Supabase on component mount
  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user])

  const loadEvents = async () => {
    if (!user) return

    setIsLoadingEvents(true)
    try {
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true })

      if (error) {
        console.error("Error loading events:", error)
        return
      }

      // Transform events to match the frontend format
      const transformedEvents = events.map((event) => {
        const startDate = new Date(event.start_time)
        const endDate = new Date(event.end_time)

        // Extract time directly from the stored timestamp (now in local time)
        const startTimeLocal = event.start_time.split('T')[1].substring(0, 5) // HH:MM format
        const endTimeLocal = event.end_time.split('T')[1].substring(0, 5) // HH:MM format

        // Handle color - use hex color if it exists, otherwise use default
        let eventColor = eventColors[0].value // default hex color
        if (event.color) {
          // If it's a hex color, use it directly
          if (event.color.startsWith('#')) {
            eventColor = event.color
          } else {
            // Try to parse as JSON (legacy format) and convert to hex
            try {
              const parsedColor = JSON.parse(event.color)
              // Find matching color by name and use its hex value
              const matchingColor = eventColors.find(c => c.name === parsedColor.name)
              eventColor = matchingColor ? matchingColor.value : eventColors[0].value
            } catch (e) {
              console.warn("Failed to parse event color, using default:", e)
              eventColor = eventColors[0].value
            }
          }
        }

        return {
          id: event.id,
          user_id: event.user_id,
          title: event.title,
          description: event.description,
          date: event.start_time.split("T")[0], // Use date from start_time
          startTime: formatTime12h(startTimeLocal),
          endTime: formatTime12h(endTimeLocal),
          is_recurring: event.is_recurring,
          created_at: event.created_at,
          color: eventColor,
          attendee: "",
          timeslots: [],
        }
      })

      setEvents(transformedEvents)
    } catch (error) {
      console.error("Error loading events:", error)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  // Convert 24h time to 12h format
  const formatTime12h = (time24) => {
    if (!time24) return ""
    const [hours, minutes] = time24.split(":")
    const hoursNum = Number.parseInt(hours, 10)
    const period = hoursNum >= 12 ? "PM" : "AM"
    const hours12 = hoursNum % 12 || 12
    return `${hours12}:${minutes} ${period}`
  }

  // Convert 12h time to 24h format
  const formatTime24h = (time12h) => {
    if (!time12h) return ""
    const [timePart, period] = time12h.split(" ")
    let [hours, minutes] = timePart.split(":")
    hours = Number.parseInt(hours, 10)
    if (hours === 12) {
      hours = period === "PM" ? 12 : 0
    } else if (period === "PM") {
      hours += 12
    }
    return `${hours.toString().padStart(2, "0")}:${minutes}`
  }

  // Calculate event position and height
  const getEventPosition = (startTime, endTime, dayEvents, eventId) => {
    const startMinutes = timeToMinutes(startTime)
    let endMinutes = timeToMinutes(endTime)
    
    // Handle overnight events (end time is next day) - but only for non-split events
    if (endMinutes < startMinutes && !eventId.includes('_overnight')) {
      endMinutes += 24 * 60 // Add 24 hours worth of minutes
    }

    const pixelsPerMinute = 64 / 60
    const startHour = Math.floor(startMinutes / 60)
    const startMinuteOffset = startMinutes % 60

    const topOffset = startMinuteOffset * pixelsPerMinute
    const durationMinutes = endMinutes - startMinutes
    const height = Math.max(20, durationMinutes * pixelsPerMinute)

    // Calculate overlap positioning
    const overlappingEvents = dayEvents.filter((event) => {
      if (event.id === eventId) return false
      const eventStart = timeToMinutes(event.startTime)
      let eventEnd = timeToMinutes(event.endTime)
      
      // Handle overnight events for overlap calculation - but only for non-split events
      if (eventEnd < eventStart && !event.id.includes('_overnight')) {
        eventEnd += 24 * 60
      }
      
      return startMinutes < eventEnd && endMinutes > eventStart
    })

    const overlapIndex = overlappingEvents.length
    const totalOverlapping = overlappingEvents.length + 1
    const width = totalOverlapping > 1 ? `${100 / totalOverlapping}%` : "100%"
    const leftOffset = totalOverlapping > 1 ? `${(overlapIndex * 100) / totalOverlapping}%` : "0%"

    return {
      topOffset,
      height,
      startHour,
      durationMinutes,
      width,
      leftOffset,
    }
  }

  const formatDateRange = () => {
    if (currentView === "day") {
      return currentDate.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    } else if (currentView === "week") {
      return "June 2025"
    } else {
      return currentDate.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    }
  }

  const handleDateClick = (day) => {
    const newDate = new Date(2025, 5, day)
    setCurrentDate(newDate)
    // Format date as YYYY-MM-DD for the form
    const formattedDate = `2025-06-${day.toString().padStart(2, "0")}`
    setSelectedDateForNewEvent(formattedDate)
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const openEditModal = (event) => {
    // Close any open previews first
    setPreviewEvent(null)
    setTooltipEvent(null)

    const startTime24 = formatTime24h(event.startTime)
    const endTime24 = formatTime24h(event.endTime)

    setSelectedEvent({
      ...event,
      startTime: startTime24,
      endTime: endTime24,
    })
    setShowEditModal(true)
  }

  const handleEventClick = (event, e) => {
    e.stopPropagation()

    // Show preview instead of directly opening edit modal
    setPreviewEvent(event)
    setPreviewPosition({ x: e.clientX, y: e.clientY })

    // Hide any tooltip that might be showing
    setTooltipEvent(null)
  }

  const handleEventMouseEnter = (event, e) => {
    // Only show tooltip if we're not already showing a preview
    if (!previewEvent) {
      setTooltipEvent(event)
      setTooltipPosition({ x: e.clientX, y: e.clientY })
    }
  }

  const handleEventMouseLeave = () => {
    setTooltipEvent(null)
  }

  const getFilteredEvents = () => {
    if (!searchTerm.trim()) {
      return events
    }
    const searchTermLower = searchTerm.toLowerCase()
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(searchTermLower) ||
        event.description?.toLowerCase().includes(searchTermLower) ||
        (event.attendee && event.attendee.toLowerCase().includes(searchTermLower)),
    )
  }

  const getUpcomingEvents = () => {
    const today = new Date()
    const filteredEvents = getFilteredEvents()

    return filteredEvents
      .filter((event) => {
        const eventDate = new Date(event.date + "T00:00:00")
        return eventDate >= today
      })
      .sort((a, b) => new Date(a.date + "T00:00:00") - new Date(b.date + "T00:00:00"))
      .slice(0, 10)
  }

  const getEventsForDay = (day, month = 5, year = 2025) => {
    const filteredEvents = getFilteredEvents()
    const dayEvents = []
    
    filteredEvents.forEach((event) => {
      const eventDate = new Date(event.date + "T00:00:00")
      const eventDay = eventDate.getDate()
      const eventMonth = eventDate.getMonth()
      const eventYear = eventDate.getFullYear()
      
      const startMinutes = timeToMinutes(event.startTime)
      const endMinutes = timeToMinutes(event.endTime)
      const isOvernightEvent = endMinutes < startMinutes
      
      // Check if event starts on this day
      if (eventDay === day && eventMonth === month && eventYear === year) {
        if (isOvernightEvent) {
          // For overnight events starting on this day, show from start time to midnight
          dayEvents.push({
            ...event,
            endTime: "11:59 PM",
            isOvernightPart: "start",
            originalStartTime: event.startTime,
            originalEndTime: event.endTime
          })
        } else {
          // Regular event
          dayEvents.push(event)
        }
      }
      
      // Check if this is an overnight event that continues from the previous day
      if (isOvernightEvent) {
        const nextDay = new Date(eventDate)
        nextDay.setDate(nextDay.getDate() + 1)
        
        if (nextDay.getDate() === day && nextDay.getMonth() === month && nextDay.getFullYear() === year) {
          // For overnight events continuing on this day, show from midnight to end time
          dayEvents.push({
            ...event,
            id: `${event.id}_overnight`,
            startTime: "12:00 AM",
            isOvernightPart: "end",
            originalStartTime: event.startTime,
            originalEndTime: event.endTime
          })
        }
      }
    })
    
    return dayEvents
  }

  const renderMiniCalendar = () => {
    const daysInMonth = 30
    const firstDayOfMonth = new Date(2025, 5, 1).getDay()
    const filteredEvents = getFilteredEvents()

    const days = []

    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevMonthDays = new Date(2025, 5, 0).getDate()
      const day = prevMonthDays - (firstDayOfMonth - i - 1)
      days.push(
        <div key={`prev-${day}`} className="text-gray-300 text-sm p-1 text-center">
          {day}
        </div>,
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === currentDate.getDate()
      const hasEvents = filteredEvents.some((event) => {
        const eventDate = new Date(event.date + "T00:00:00")
        return eventDate.getDate() === day && eventDate.getMonth() === 5
      })

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`text-sm p-1 text-center cursor-pointer hover:bg-gray-100 relative ${
            isToday ? "bg-blue-500 text-white rounded-full" : ""
          }`}
        >
          {day}
          {hasEvents && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
          )}
        </div>,
      )
    }

    return days
  }

  const renderUpcomingEvents = () => {
    const upcomingEvents = getUpcomingEvents()

    if (isLoadingEvents) {
      return (
        <div className="text-gray-500 text-sm flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          Loading events...
        </div>
      )
    }

    if (upcomingEvents.length === 0) {
      return <div className="text-gray-500 text-sm">No upcoming events. Add an event to see it here.</div>
    }

    const groupedEvents = upcomingEvents.reduce((groups, event) => {
      const eventDate = new Date(event.date + "T00:00:00")
      const dateKey = eventDate.toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
      return groups
    }, {})

    return Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
      <div key={dateKey} className="mb-4">
        <h3 className="font-semibold text-sm mb-2">
          {new Date(dateKey).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </h3>
        {dayEvents.map((event) => (
          <div
            key={event.id}
            className="mb-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
            onClick={(e) => handleEventClick(event, e)}
            onMouseEnter={(e) => handleEventMouseEnter(event, e)}
            onMouseLeave={handleEventMouseLeave}
          >
            <div className="w-2 h-2 rounded-full inline-block mr-2" style={{ backgroundColor: event.color }}></div>
            <span className="text-xs">
              {formatEventTimeRange(event)}
            </span>
            <div className="text-sm font-medium">{event.title}</div>
          </div>
        ))}
      </div>
    ))
  }

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate)
    const day = currentDate.getDay()
    startOfWeek.setDate(currentDate.getDate() - day)

    return (
      <div className="flex-1 overflow-auto max-h-full">
        <div className="min-w-[600px] sm:min-w-[800px]">
          <div className="grid grid-cols-8 border-l sticky top-0 bg-white z-10">
            <div className="border-r border-gray-200 h-12 sm:h-16"></div>
            {daysOfWeek.map((day, index) => {
              const dayDate = new Date(startOfWeek)
              dayDate.setDate(startOfWeek.getDate() + index)
              const dayNumber = dayDate.getDate()
              
              return (
                <div
                  key={`week-header-${index}`}
                  className="border-r border-gray-200 p-1 sm:p-2 text-center min-w-[70px] sm:min-w-[100px] h-12 sm:h-16 flex flex-col justify-center font-medium"
                >
                  <div className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{dayNumber}</div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-8" style={{ height: `${timeSlots.length * 64}px` }}>
            <div className="border-r border-gray-200">
              {timeSlots.map((time, index) => (
                <div key={`time-slot-${index}`} className="border-b border-gray-200 h-16 text-xs text-gray-500 p-1 sm:p-2 text-right">
                  <span className="hidden sm:inline">{time}</span>
                  <span className="sm:hidden">
                    {time.split(":")[0]}
                    {time.includes("AM") ? "a" : "p"}
                  </span>
                </div>
              ))}
            </div>

            {daysOfWeek.map((day, dayIndex) => {
              const dayDate = new Date(startOfWeek)
              dayDate.setDate(startOfWeek.getDate() + dayIndex)
              const dayEvents = getEventsForDay(dayDate.getDate())

              return (
                <div key={`day-${dayIndex}`} className="border-r border-gray-200 relative min-w-[70px] sm:min-w-[100px]">
                  {timeSlots.map((time, timeIndex) => {
                    const timeHour = timeIndex

                    return (
                      <div key={`day-${dayIndex}-time-${timeIndex}`} className="border-b border-gray-200 h-16 relative">
                        {dayEvents.map((event) => {
                          const { topOffset, height, startHour, width, leftOffset } = getEventPosition(
                            event.startTime,
                            event.endTime,
                            dayEvents,
                            event.id,
                          )

                          if (startHour !== timeHour) return null

                          return (
                            <div
                              key={event.id}
                              onClick={(e) => handleEventClick(event, e)}
                              onMouseEnter={(e) => handleEventMouseEnter(event, e)}
                              onMouseLeave={handleEventMouseLeave}
                              className="absolute text-white rounded-lg p-1 cursor-pointer hover:shadow-md z-10 text-xs"
                              style={{
                                top: `${topOffset}px`,
                                height: `${Math.max(30, height)}px`,
                                width: width,
                                left: leftOffset,
                                backgroundColor: event.color,
                              }}
                            >
                              <div className="font-medium text-xs leading-tight">
                                <span className="hidden sm:inline">
                                  {formatEventTimeRange(event)}
                                </span>
                                <span className="sm:hidden">{event.startTime.split(" ")[0]}</span>
                              </div>
                              <div className="text-xs truncate">{event.title}</div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate.getDate())

    return (
      <div className="flex-1 overflow-auto max-h-full">
        <div className="relative" style={{ height: `${timeSlots.length * 64}px` }}>
          {timeSlots.map((time, index) => {
            const timeHour = index

            return (
              <div key={`time-${index}`} className="border-b border-gray-200 h-16 relative flex">
                <div className="w-12 sm:w-16 text-xs text-gray-500 p-1 sm:p-2 text-right border-r border-gray-200 flex-shrink-0">
                  <span className="hidden sm:inline">{time}</span>
                  <span className="sm:hidden">
                    {time.split(":")[0]}
                    {time.includes("AM") ? "a" : "p"}
                  </span>
                </div>
                <div className="flex-1 relative">
                  {dayEvents.map((event) => {
                    const { topOffset, height, startHour, width, leftOffset } = getEventPosition(
                      event.startTime,
                      event.endTime,
                      dayEvents,
                      event.id,
                    )

                    if (startHour !== timeHour) return null

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        onMouseEnter={(e) => handleEventMouseEnter(event, e)}
                        onMouseLeave={handleEventMouseLeave}
                        className="absolute text-white rounded-lg p-2 cursor-pointer hover:shadow-md z-10 text-xs"
                        style={{
                          top: `${topOffset}px`,
                          height: `${Math.max(40, height)}px`,
                          width: width,
                          left: leftOffset,
                          backgroundColor: event.color,
                        }}
                      >
                        <div className="font-medium text-xs leading-tight">
                          {formatEventTimeRange(event)}
                        </div>
                        <div className="text-xs truncate mt-1">{event.title}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const daysInMonth = 30
    const firstDayOfMonth = new Date(2025, 5, 1).getDay()

    const weeks = []
    let currentWeek = []

    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevMonthDays = new Date(2025, 5, 0).getDate()
      const day = prevMonthDays - (firstDayOfMonth - i - 1)
      currentWeek.push(
        <div key={`prev-${day}`} className="h-24 sm:h-32 border-r border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-300 p-1">{day}</div>
        </div>,
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day)

      currentWeek.push(
        <div
          key={day}
          className="h-24 sm:h-32 border-r border-gray-200 p-1 cursor-pointer hover:bg-gray-50 overflow-hidden"
          onClick={() => handleDateClick(day)}
        >
          <div className="text-sm font-medium mb-1">{day.toString().padStart(2, "0")}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, window.innerWidth < 640 ? 2 : 3).map((event) => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEventClick(event, e)
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation()
                  handleEventMouseEnter(event, e)
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation()
                  handleEventMouseLeave()
                }}
                className="text-xs p-1 rounded-lg text-white truncate cursor-pointer hover:shadow-md"
                style={{ backgroundColor: event.color }}
              >
                <div className="font-medium text-xs">
                  <span className="hidden sm:inline">{formatEventTimeRange(event)}</span>
                  <span className="sm:hidden">{event.startTime.split(" ")[0]}</span>
                </div>
                <div className="truncate">{event.title}</div>
              </div>
            ))}
            {dayEvents.length > (window.innerWidth < 640 ? 2 : 3) && (
              <div className="text-xs text-gray-500 p-1">
                +{dayEvents.length - (window.innerWidth < 640 ? 2 : 3)} more
              </div>
            )}
          </div>
        </div>,
      )

      if (currentWeek.length === 7) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="grid grid-cols-7 border-b border-gray-200">
            {currentWeek}
          </div>,
        )
        currentWeek = []
      }
    }

    while (currentWeek.length < 7) {
      currentWeek.push(
        <div key={`empty-${currentWeek.length}`} className="h-24 sm:h-32 border-r border-gray-200 bg-gray-50"></div>,
      )
    }

    if (currentWeek.length > 0) {
      weeks.push(
        <div key={`week-${weeks.length}`} className="grid grid-cols-7 border-b border-gray-200">
          {currentWeek}
        </div>,
      )
    }

    return (
      <div className="flex-1 overflow-auto max-h-full">
        <div className="grid grid-cols-7 border-b border-gray-200 sticky top-0 bg-white z-10">
          {daysOfWeek.map((day, index) => (
            <div key={`month-header-${index}`} className="p-2 sm:p-4 text-center font-medium text-sm border-r border-gray-200">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div>{weeks}</div>
      </div>
    )
  }

  const KalendarLogo = () => (
    <div className="text-lg font-bold font-sans">
      <span className="text-blue-500">k</span>
      <span className="text-red-500">a</span>
      <span className="text-yellow-500">l</span>
      <span className="text-green-500">i</span>
      <span className="text-blue-600">n</span>
      <span className="text-orange-500">d</span>
      <span className="text-red-600">a</span>
      <span className="text-green-600">r</span>
    </div>
  )

  // Tooltip component for quick preview on hover
  const EventTooltip = ({ event, position }) => {
    if (!event || !position) return null

    return (
      <div
        className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 p-2 text-xs w-48"
        style={{
          left: `${position.x + 10}px`,
          top: `${position.y + 10}px`,
        }}
      >
        <div className="font-medium text-gray-900">{event.title}</div>
        <div className="text-gray-600 mt-1">
          {formatEventTimeRange(event)}
        </div>
        {event.location && (
          <div className="text-gray-600 mt-1 flex items-center">
            <MapPin size={10} className="mr-1" /> {event.location}
          </div>
        )}
        <div className="text-blue-500 mt-1 flex items-center">
          <Info size={10} className="mr-1" /> Click for details
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white font-sans">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-50 w-64 h-full border-r border-gray-200 p-4 bg-white transition-transform duration-300 overflow-y-auto font-sans`}
      >
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <KalendarLogo />
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeekShort.map((day, index) => (
                <div key={`day-header-${index}`} className="text-xs text-gray-500 text-center p-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderMiniCalendar()}</div>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Upcoming events</h3>
            {renderUpcomingEvents()}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-200 p-2 sm:p-4 flex items-center justify-between flex-shrink-0 font-sans">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold truncate">{formatDateRange()}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            <div className="flex bg-gray-100 rounded-md p-1">
              <Button
                variant={currentView === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("day")}
                className={`text-xs px-2 sm:px-4 py-1 w-12 sm:w-16 font-medium ${currentView === "day" ? "bg-blue-500 text-white" : ""}`}
              >
                Day
              </Button>
              <Button
                variant={currentView === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("week")}
                className={`text-xs px-2 sm:px-4 py-1 w-12 sm:w-16 font-medium ${currentView === "week" ? "bg-blue-500 text-white" : ""}`}
              >
                Week
              </Button>
              <Button
                variant={currentView === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("month")}
                className={`text-xs px-2 sm:px-4 py-1 w-12 sm:w-16 font-medium ${currentView === "month" ? "bg-blue-500 text-white" : ""}`}
              >
                Month
              </Button>
            </div>

            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1"
              onClick={() => {
                setShowAddModal(true)
                // If no specific date selected, use current date
                if (!selectedDateForNewEvent) {
                  setSelectedDateForNewEvent(currentDate.toISOString().split("T")[0])
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add event</span>
              <span className="sm:hidden">Add</span>
            </Button>

            <div className="relative group">
              <Avatar className="h-6 w-6 md:h-8 md:w-8 cursor-pointer">
                <AvatarImage src="https://cdn-icons-png.flaticon.com/512/3736/3736502.png" alt="User profile" />
                <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="font-medium text-sm">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {showMobileSearch && (
          <div className="md:hidden border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden font-sans">
          {currentView === "week" && renderWeekView()}
          {currentView === "day" && renderDayView()}
          {currentView === "month" && renderMonthView()}
        </div>
      </div>

      {/* Event tooltip (quick preview on hover) */}
      {tooltipEvent && !previewEvent && <EventTooltip event={tooltipEvent} position={tooltipPosition} />}

      {/* Event preview (detailed preview on click) */}
      {previewEvent && (
        <EventPreview
          event={previewEvent}
          position={previewPosition}
          onClose={() => setPreviewEvent(null)}
          onEdit={openEditModal}
        />
      )}

      {showAddModal && (
        <EventForm
          user={user}
          onClose={() => {
            setShowAddModal(false)
            setSelectedDateForNewEvent(null)
          }}
          onEventSaved={loadEvents}
          selectedDate={selectedDateForNewEvent}
          existingEvents={events}
        />
      )}
      {showEditModal && (
        <EventForm
          user={user}
          event={selectedEvent}
          onClose={() => {
            setShowEditModal(false)
            setSelectedEvent(null)
          }}
          onEventSaved={loadEvents}
          isEdit={true}
          existingEvents={events}
        />
      )}
    </div>
  )
}
