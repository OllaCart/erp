import type { CalendarEvent, EventType } from "@/types/erp"
import { v4 as uuidv4 } from "uuid"

const STORAGE_KEY = "wayward-calendar-events"

let events: CalendarEvent[] = []
let hydrated = false

function parseStored(raw: string): CalendarEvent[] {
  try {
    const arr = JSON.parse(raw) as Array<
      Omit<CalendarEvent, "startDate" | "endDate"> & { startDate: string; endDate?: string }
    >
    if (!Array.isArray(arr)) return []
    return arr.map((e) => ({
      ...e,
      attending: e.attending !== false,
      startDate: new Date(e.startDate),
      endDate: e.endDate ? new Date(e.endDate) : undefined,
    }))
  } catch {
    return []
  }
}

function persist(): void {
  if (typeof window === "undefined") return
  const serial = events.map((e) => ({
    ...e,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString(),
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serial))
}

function ensureHydrated(): void {
  if (typeof window === "undefined") return
  if (hydrated) return
  hydrated = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) events = parseStored(raw)
}

export const CalendarService = {
  addEvent: async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
    ensureHydrated()
    const newEvent: CalendarEvent = {
      id: uuidv4(),
      ...event,
      attending: event.attending !== false,
      startDate: new Date(event.startDate),
      endDate: event.endDate ? new Date(event.endDate) : undefined,
    }
    events.push(newEvent)
    persist()
    return newEvent
  },

  updateEvent: async (id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent | null> => {
    ensureHydrated()
    const i = events.findIndex((e) => e.id === id)
    if (i === -1) return null
    const prev = events[i]
    const next: CalendarEvent = {
      ...prev,
      ...patch,
      startDate: patch.startDate != null ? new Date(patch.startDate) : prev.startDate,
      endDate: patch.endDate !== undefined ? (patch.endDate ? new Date(patch.endDate) : undefined) : prev.endDate,
    }
    events[i] = next
    persist()
    return next
  },

  deleteEvent: async (id: string): Promise<boolean> => {
    ensureHydrated()
    const n = events.length
    events = events.filter((e) => e.id !== id)
    if (events.length !== n) persist()
    return events.length < n
  },

  getUserEvents: async (userId: string): Promise<CalendarEvent[]> => {
    ensureHydrated()
    return events.filter((e) => e.userId === userId)
  },

  getEventsByType: async (userId: string, type: EventType): Promise<CalendarEvent[]> => {
    ensureHydrated()
    return events.filter((e) => e.userId === userId && e.type === type)
  },

  getEventsForToday: async (userId: string): Promise<CalendarEvent[]> => {
    ensureHydrated()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return events.filter((e) => e.userId === userId && e.startDate >= today && e.startDate < tomorrow)
  },

  getEventsByDateRange: async (userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    ensureHydrated()
    return events.filter((e) => e.userId === userId && e.startDate >= startDate && e.startDate <= endDate)
  },

  getUpcomingEvents: async (userId: string, limit = 5): Promise<CalendarEvent[]> => {
    ensureHydrated()
    const now = new Date()
    return events
      .filter((e) => e.userId === userId && e.startDate >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit)
  },
}
