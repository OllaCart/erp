import type { CalendarEvent, EventType } from "@/types/erp"
import { v4 as uuidv4 } from "uuid"

// In-memory storage for demo purposes
const events: CalendarEvent[] = []

export const CalendarService = {
  // Add a new event
  addEvent: async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
    const newEvent: CalendarEvent = {
      id: uuidv4(),
      ...event,
      startDate: new Date(event.startDate),
      endDate: event.endDate ? new Date(event.endDate) : undefined,
    }

    events.push(newEvent)
    return newEvent
  },

  // Get all events for a user
  getUserEvents: async (userId: string): Promise<CalendarEvent[]> => {
    return events.filter((e) => e.userId === userId)
  },

  // Get events by type
  getEventsByType: async (userId: string, type: EventType): Promise<CalendarEvent[]> => {
    return events.filter((e) => e.userId === userId && e.type === type)
  },

  // Get events for today
  getEventsForToday: async (userId: string): Promise<CalendarEvent[]> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return events.filter((e) => e.userId === userId && e.startDate >= today && e.startDate < tomorrow)
  },

  // Get events for a specific date range
  getEventsByDateRange: async (userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    return events.filter((e) => e.userId === userId && e.startDate >= startDate && e.startDate <= endDate)
  },

  // Get upcoming events
  getUpcomingEvents: async (userId: string, limit = 5): Promise<CalendarEvent[]> => {
    const now = new Date()

    return events
      .filter((e) => e.userId === userId && e.startDate >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit)
  },
}
