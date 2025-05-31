"use client"

import { useState, useEffect, useRef } from "react"
import { X, Clock, User, Calendar, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate, formatEventTimeRange } from "../../lib/date-utils"

export default function EventPreview({ event, position, onClose, onEdit }) {
  const [isVisible, setIsVisible] = useState(false)
  const previewRef = useRef(null)

  useEffect(() => {
    // Animation effect - fade in
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50)

    // Click outside to close
    const handleClickOutside = (e) => {
      if (previewRef.current && !previewRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Calculate optimal position to ensure preview stays within viewport
  const getOptimalPosition = () => {
    if (!position) return {}

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const previewWidth = 320 // Estimated preview width
    const previewHeight = 250 // Estimated preview height

    let left = position.x
    let top = position.y + 10

    // Adjust horizontal position if too close to right edge
    if (left + previewWidth > viewportWidth - 20) {
      left = Math.max(20, viewportWidth - previewWidth - 20)
    }

    // Adjust vertical position if too close to bottom edge
    if (top + previewHeight > viewportHeight - 20) {
      top = Math.max(20, position.y - previewHeight - 10)
    }

    return { left, top }
  }

  if (!event) return null

  const optimalPosition = getOptimalPosition()

  return (
    <div
      ref={previewRef}
      className={`fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80 transition-opacity duration-200 font-sans ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        left: `${optimalPosition.left}px`,
        top: `${optimalPosition.top}px`,
      }}
    >
      <div className="h-2 w-full rounded-t-lg" style={{ backgroundColor: event.color }}></div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 pr-6">{event.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <Calendar size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <div className="text-gray-700">{formatDate(event.date)}</div>
            </div>
          </div>

          <div className="flex items-start">
            <Clock size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <div className="text-gray-700">
                {formatEventTimeRange(event)}
              </div>
            </div>
          </div>

          {event.attendee && (
            <div className="flex items-start">
              <User size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-gray-700">{event.attendee}</div>
            </div>
          )}

          {event.description && (
            <div className="mt-3 text-gray-600 border-t border-gray-100 pt-3">
              <p className="line-clamp-3">{event.description}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="outline" className="mr-2" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => onEdit(event)}>
            <Edit size={14} className="mr-1" /> Edit
          </Button>
        </div>
      </div>
    </div>
  )
}
