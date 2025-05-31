"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Clock, Menu } from "lucide-react"
import { supabase } from "../../lib/supabase"

const eventColors = [
  { name: "Pink", value: "#FFCBE1" },
  { name: "Green", value: "#D6E5BD" },
  { name: "Yellow", value: "#F9E1A8" },
  { name: "Blue", value: "#BCD8EC" },
  { name: "Purple", value: "#DCCCEC" },
  { name: "Peach", value: "#FFDAB4" },
]

export default function EventForm({ user, event = null, onClose, onEventSaved, isEdit = false, selectedDate = null }) {
  // Helper functions
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

  // Handle color initialization for existing events
  const getInitialColor = () => {
    if (!event?.color) return eventColors[0] // Default to first color object
    
    // If it's a hex color, find matching color object
    if (typeof event.color === 'string' && event.color.startsWith('#')) {
      const matchingColor = eventColors.find(c => c.value === event.color)
      if (matchingColor) {
        return matchingColor
      } else {
        // It's a custom color
        return { name: "Custom", value: event.color }
      }
    }
    
    // Fallback to default
    return eventColors[0]
  }

  const [formData, setFormData] = useState({
    title: event?.title || "",
    description: event?.description || "",
    date: event?.date || selectedDate || "",
    startTime: event?.startTime ? formatTime24h(event.startTime) : "",
    endTime: event?.endTime ? formatTime24h(event.endTime) : "",
    color: getInitialColor(),
    customColor: event?.color && !eventColors.find(c => c.value === event.color) ? event.color : "#3B82F6",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const handleCustomColorChange = (e) => {
    const customColor = e.target.value
    setFormData((prev) => ({
      ...prev,
      customColor: customColor,
      color: { name: "Custom", value: customColor },
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    }

    if (!formData.date) {
      newErrors.date = "Date is required"
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required"
    }

    if (!formData.endTime) {
      newErrors.endTime = "End time is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    console.log("Starting handleSave...")
    if (!validateForm()) {
      console.log("Form validation failed")
      return
    }

    console.log("Form validation passed, setting loading...")
    setIsLoading(true)

    try {
      // Create timestamp strings for database (as local time)
      let startTimestamp = `${formData.date}T${formData.startTime}:00`
      let endTimestamp
      
      // Handle overnight events - if end time is earlier than start time, it's next day
      if (formData.endTime < formData.startTime) {
        const nextDay = new Date(formData.date)
        nextDay.setDate(nextDay.getDate() + 1)
        endTimestamp = `${nextDay.toISOString().split('T')[0]}T${formData.endTime}:00`
      } else {
        endTimestamp = `${formData.date}T${formData.endTime}:00`
      }

      console.log("Proceeding with save - timestamps:", { startTimestamp, endTimestamp })

      if (isEdit) {
        // Update existing event
        console.log("Updating event with data:", {
          title: formData.title,
          description: formData.description,
          start_time: startTimestamp,
          end_time: endTimestamp,
        })
        
        const { error: eventError } = await supabase
          .from("events")
          .update({
            title: formData.title,
            description: formData.description,
            start_time: startTimestamp,
            end_time: endTimestamp,
            color: formData.color.value,
          })
          .eq("id", event.id)

        if (eventError) {
          console.error("Error updating event:", eventError)
          
          // Check if it's a time overlap constraint violation from your database trigger
          if (eventError.message && (
              eventError.message.includes('Event overlaps with an existing') ||
              eventError.message.includes('overlap') ||
              eventError.message.includes('conflicting') ||
              eventError.message.includes('time slot') ||
              eventError.code === 'P0001' || // PostgreSQL RAISE EXCEPTION
              eventError.code === '23P01'    // PostgreSQL exclusion constraint violation
            )) {
            setErrors({
              time: "This time slot conflicts with an existing event. Please choose a different time."
            })
          } else {
            alert(`Failed to update event: ${eventError.message}`)
          }
          setIsLoading(false)
          return
        }
      } else {
        // Create new event
        console.log("Creating new event with data:", {
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          start_time: startTimestamp,
          end_time: endTimestamp,
          is_recurring: false,
        })
        
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .insert([
            {
              user_id: user.id,
              title: formData.title,
              description: formData.description,
              start_time: startTimestamp,
              end_time: endTimestamp,
              is_recurring: false,
              created_at: new Date().toISOString(),
              color: formData.color.value,
            },
          ])
          .select()
          .single()

        if (eventError) {
          console.error("Error creating event:", eventError)
          
          // Check if it's a time overlap constraint violation from your database trigger
          if (eventError.message && (
              eventError.message.includes('Event overlaps with an existing') ||
              eventError.message.includes('overlap') ||
              eventError.message.includes('conflicting') ||
              eventError.message.includes('time slot') ||
              eventError.code === 'P0001' || // PostgreSQL RAISE EXCEPTION
              eventError.code === '23P01'    // PostgreSQL exclusion constraint violation
            )) {
            setErrors({
              time: "This time slot conflicts with an existing event. Please choose a different time."
            })
          } else {
            alert(`Failed to create event: ${eventError.message}`)
          }
          setIsLoading(false)
          return
        }
      }

      console.log("Event saved successfully!")
      setIsLoading(false)
      onEventSaved()
      onClose()
    } catch (error) {
      console.error("Error saving event:", error)
      
      // Check if it's a database constraint violation that wasn't caught above
      if (error.message && (
          error.message.includes('Event overlaps with an existing') ||
          error.message.includes('overlap') ||
          error.message.includes('conflicting') ||
          error.message.includes('time slot') ||
          error.code === 'P0001' ||
          error.code === '23P01'
        )) {
        setErrors({
          time: "This time slot conflicts with an existing event. Please choose a different time."
        })
      } else {
        alert("Failed to save event. Please try again.")
      }
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit || !event) return

    if (!confirm("Are you sure you want to delete this event?")) return

    setIsLoading(true)

    try {
      // Try to delete associated timeslots first (optional)
      try {
        const { error: timeslotError } = await supabase.from("timeslot").delete().eq("event_id", event.id)
        if (timeslotError) {
          console.warn("Error deleting timeslots (non-critical):", timeslotError)
        }
      } catch (timeslotCatchError) {
        console.warn("Timeslot table might not exist:", timeslotCatchError)
      }

      // Delete the event
      const { error: eventError } = await supabase.from("events").delete().eq("id", event.id)

      if (eventError) {
        console.error("Error deleting event:", eventError)
        alert(`Failed to delete event: ${eventError.message}`)
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      onEventSaved()
      onClose()
    } catch (error) {
      console.error("Error deleting event:", error)
      alert("Failed to delete event. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Menu className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">{isEdit ? "Edit Event" : "Add Event"}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Add title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`text-lg border-0 border-b-2 border-blue-500 rounded-none px-0 focus:ring-0 ${
                errors.title ? "border-red-500" : ""
              }`}
              autoComplete="off"
            />
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}

            <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">Event</div>

            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <Input
                    type="date"
                    name="date"
                    min="2025-06-01"
                    max="2025-06-30"
                    value={formData.date}
                    onChange={handleInputChange}
                    placeholder="Select date"
                    className={`text-sm ${errors.date ? "border-red-500" : ""}`}
                  />
                  {errors.date && <p className="text-red-500 text-sm">{errors.date}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    placeholder="Start time"
                    className={`text-sm ${errors.startTime ? "border-red-500" : ""}`}
                  />
                  <Input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    placeholder="End time"
                    className={`text-sm ${errors.endTime ? "border-red-500" : ""}`}
                  />
                </div>
                {(errors.startTime || errors.endTime || errors.time) && (
                  <p className="text-red-500 text-sm mt-1">{errors.startTime || errors.endTime || errors.time}</p>
                )}
              </div>
            </div>

            <Textarea
              placeholder="Add description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="border-0 border-b border-gray-300 rounded-none px-0 resize-none text-sm"
              rows={2}
              autoComplete="off"
            />

            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-3">
                {/* Preset color buttons */}
                {eventColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-6 h-6 rounded-full ${
                      formData.color.name === color.name ? "ring-2 ring-gray-400" : ""
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
                
                {/* Custom color wheel picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={formData.customColor}
                    onChange={handleCustomColorChange}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 cursor-pointer opacity-0 absolute inset-0"
                    title="Choose custom color"
                  />
                  <div 
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                      formData.color.name === "Custom" ? "ring-2 ring-gray-400 border-gray-400" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: formData.customColor }}
                  >
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 space-y-2 sm:space-y-0">
              <div className="flex space-x-2">
                {isEdit && (
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isLoading}>
                    Delete
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
