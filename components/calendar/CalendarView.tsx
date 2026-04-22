"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react"
import type { BusinessId } from "@/types/db"

interface CalendarEvent {
  id: string
  business_id: BusinessId
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  event_type: string
  attendees: Array<{ email: string; name?: string; status?: string }> | null
  claude_prep_notes: string | null
  calendar_account: string
}

const BUSINESSES: Array<{ id: BusinessId | "all"; label: string; color: string; dot: string }> = [
  { id: "all",            label: "All",              color: "bg-zinc-500",   dot: "bg-zinc-400" },
  { id: "swiftfi",        label: "SwiftFi",          color: "bg-blue-500",   dot: "bg-blue-400" },
  { id: "unbeatableloans",label: "UnbeatableLoans",  color: "bg-amber-500",  dot: "bg-amber-400" },
  { id: "ollacart",       label: "OllaCart",         color: "bg-orange-500", dot: "bg-orange-400" },
]

const EVENT_TYPE_LABELS: Record<string, string> = {
  investor_meeting: "Investor",
  dev_sync:         "Dev Sync",
  customer_call:    "Customer",
  internal:         "Internal",
  personal:         "Personal",
  pitch:            "Pitch",
  other:            "Other",
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  investor_meeting: "bg-purple-100 text-purple-700",
  dev_sync:         "bg-teal-100 text-teal-700",
  customer_call:    "bg-blue-100 text-blue-700",
  pitch:            "bg-pink-100 text-pink-700",
  internal:         "bg-zinc-100 text-zinc-600",
  personal:         "bg-green-100 text-green-700",
  other:            "bg-zinc-100 text-zinc-600",
}

const BUSINESS_DOT: Record<BusinessId, string> = {
  swiftfi:          "bg-blue-400",
  unbeatableloans:  "bg-amber-400",
  ollacart:         "bg-orange-400",
  personal:         "bg-zinc-400",
  mortgage:         "bg-green-400",
  projects:         "bg-indigo-400",
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function startOfWeek(d: Date) {
  const date = new Date(d)
  date.setDate(d.getDate() - d.getDay())
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number) {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [activeBusiness, setActiveBusiness] = useState<BusinessId | "all">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      const startDate = weekStart.toISOString()
      const endDate = addDays(weekStart, 6).toISOString()
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      if (activeBusiness !== "all") params.set("business_id", activeBusiness)

      const res = await fetch(`/api/calendar/events?${params}`)
      if (!res.ok) throw new Error("Failed to fetch events")
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness, weekStart])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  async function handleSync() {
    setIsSyncing(true)
    try {
      await fetch("/api/calendar/sync", { method: "POST" })
      await fetchEvents()
    } finally {
      setIsSyncing(false)
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Business tabs + sync */}
      <div className="flex gap-2 flex-wrap items-center">
        {BUSINESSES.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBusiness(b.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeBusiness === b.id
                ? `${b.color} text-white`
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {b.label}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
          Sync Google Calendar
        </Button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => addDays(w, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium flex-1 text-center">
          {formatDate(weekStart.toISOString())} — {formatDate(addDays(weekStart, 6).toISOString())}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart((w) => addDays(w, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          Today
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Agenda view — grouped by day */}
          <div className="space-y-4">
            {weekDays.map((day) => {
              const dayEvents = events.filter((e) =>
                isSameDay(new Date(e.start_time), day),
              )
              const isToday = isSameDay(day, today)

              return (
                <div key={day.toISOString()}>
                  {/* Day header */}
                  <div className={`flex items-center gap-2 mb-2 pb-1 border-b ${isToday ? "border-primary" : "border-border"}`}>
                    <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    {isToday && <Badge variant="outline" className="text-xs py-0">Today</Badge>}
                    {dayEvents.length === 0 && (
                      <span className="text-xs text-muted-foreground ml-auto">No events</span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="space-y-2 ml-2">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      >
                        <div className="flex items-start gap-3 p-3">
                          {/* Business color dot */}
                          <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${BUSINESS_DOT[event.business_id]}`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium">{event.title}</span>
                              <Badge className={`text-xs px-1.5 py-0 ${EVENT_TYPE_COLORS[event.event_type] ?? "bg-zinc-100 text-zinc-600"}`} variant="outline">
                                {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatTime(event.start_time)} – {formatTime(event.end_time)}
                            </p>

                            {event.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}

                            {/* Expanded */}
                            {expandedId === event.id && (
                              <div className="mt-2 border-t pt-2 space-y-2">
                                {event.description && (
                                  <p className="text-xs text-muted-foreground">{event.description}</p>
                                )}
                                {event.attendees && event.attendees.length > 0 && (
                                  <div className="flex items-start gap-1">
                                    <Users className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                                    <p className="text-xs text-muted-foreground">
                                      {event.attendees.map((a) => a.name ?? a.email).join(", ")}
                                    </p>
                                  </div>
                                )}
                                {event.claude_prep_notes && (
                                  <div className="rounded bg-muted p-2">
                                    <p className="text-xs font-medium mb-1">Claude prep notes</p>
                                    <p className="text-xs text-muted-foreground">{event.claude_prep_notes}</p>
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {event.business_id} · {event.calendar_account}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
