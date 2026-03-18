"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import type { CalendarEvent, DailyPlan, DailyRoutine } from "@/types/erp"
import { CalendarService } from "@/lib/calendar-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format, addDays, startOfWeek, addWeeks, isSameDay, addHours, startOfDay, setHours, setMinutes } from "date-fns"
import {
  ClockIcon,
  PlusIcon,
  EditIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  LinkIcon,
  GripVerticalIcon,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface TimeSlot {
  time: string
  available: boolean
  event?: CalendarEvent
}

interface MeetingBooking {
  id: string
  title: string
  duration: number
  description?: string
  availableSlots: TimeSlot[]
  bookingUrl: string
}

export const CalendarDashboard: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date()))
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [routines, setRoutines] = useState<DailyRoutine[]>([])
  const [meetingBookings, setMeetingBookings] = useState<MeetingBooking[]>([])
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)
  const [newBooking, setNewBooking] = useState<Partial<MeetingBooking>>({})
  const dailyScrollRef = useRef<HTMLDivElement>(null)
  const rangeDragRef = useRef<{ startH: number; endH: number } | null>(null)

  const userId = "user-123"

  const CAL_HOUR_START = 7
  const CAL_HOUR_END = 21

  const [createOpen, setCreateOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<{
    start: Date
    end: Date
    title: string
    attending: boolean
  } | null>(null)
  const [rangePreview, setRangePreview] = useState<{ lo: number; hi: number } | null>(null)
  const rangeActiveRef = useRef(false)

  const reloadEvents = async () => {
    const userEvents = await CalendarService.getUserEvents(userId)
    setEvents(userEvents)
  }

  useEffect(() => {
    void reloadEvents()
    loadDailyPlan(selectedDate)
    loadRoutines()
    loadMeetingBookings()
  }, [selectedDate])

  const openCreateDialog = (start: Date, end: Date) => {
    setCreateDraft({
      start,
      end: end > start ? end : addHours(start, 1),
      title: "New event",
      attending: true,
    })
    setCreateOpen(true)
  }

  const saveNewEvent = async () => {
    if (!createDraft?.title.trim()) return
    await CalendarService.addEvent({
      userId,
      title: createDraft.title.trim(),
      type: "other",
      startDate: createDraft.start,
      endDate: createDraft.end,
      attending: createDraft.attending,
    })
    await reloadEvents()
    setCreateOpen(false)
    setCreateDraft(null)
  }

  const setEventAttending = async (ev: CalendarEvent, attending: boolean) => {
    await CalendarService.updateEvent(ev.id, { attending })
    await reloadEvents()
  }

  const handleDragOverGrid = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  useEffect(() => {
    const onUp = () => {
      if (!rangeActiveRef.current || !rangeDragRef.current) return
      rangeActiveRef.current = false
      const r = rangeDragRef.current
      rangeDragRef.current = null
      setRangePreview(null)
      const lo = Math.min(r.startH, r.endH)
      const hi = Math.max(r.startH, r.endH)
      const d = selectedDate
      openCreateDialog(addHours(startOfDay(d), lo), addHours(startOfDay(d), hi + 1))
    }
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [selectedDate])

  const loadRoutines = () => {
    const sampleRoutines: DailyRoutine[] = [
      {
        id: "1",
        userId,
        name: "Weekday Morning Routine",
        isDefault: true,
        timeBlocks: [
          {
            id: "1",
            startTime: "06:00",
            endTime: "06:30",
            title: "Morning Exercise",
            description: "30 minutes of cardio or strength training",
            category: "health",
            isFlexible: false,
          },
          {
            id: "2",
            startTime: "06:30",
            endTime: "07:00",
            title: "Shower & Get Ready",
            description: "Personal hygiene and getting dressed",
            category: "personal",
            isFlexible: false,
          },
          {
            id: "3",
            startTime: "07:00",
            endTime: "07:30",
            title: "Breakfast",
            description: "Healthy breakfast and coffee",
            category: "personal",
            isFlexible: true,
          },
        ],
        tags: ["morning", "weekday", "productive"],
      },
    ]
    setRoutines(sampleRoutines)
  }

  const loadMeetingBookings = () => {
    const sampleBookings: MeetingBooking[] = [
      {
        id: "1",
        title: "30-minute Strategy Session",
        duration: 30,
        description: "Discuss your goals and create an action plan",
        availableSlots: generateTimeSlots(),
        bookingUrl: "https://calendly.com/user/30min-strategy",
      },
      {
        id: "2",
        title: "1-hour Consultation",
        duration: 60,
        description: "Deep dive consultation on your project",
        availableSlots: generateTimeSlots(),
        bookingUrl: "https://calendly.com/user/1hour-consultation",
      },
    ]
    setMeetingBookings(sampleBookings)
  }

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const startHour = 9
    const endHour = 17

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        available: Math.random() > 0.3, // Random availability for demo
      })
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:30`,
        available: Math.random() > 0.3,
      })
    }

    return slots
  }

  const loadDailyPlan = (date: Date) => {
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      const samplePlan: DailyPlan = {
        id: "1",
        userId,
        date,
        routineId: "1",
        customBlocks: [
          {
            id: "1",
            startTime: "09:00",
            endTime: "12:00",
            title: "Project Meeting",
            description: "Weekly team sync and planning",
            category: "work",
            completed: false,
          },
          {
            id: "2",
            startTime: "13:00",
            endTime: "14:00",
            title: "Lunch with Sarah",
            description: "Catch up over lunch",
            category: "social",
            completed: false,
          },
        ],
        notes: "Important day - quarterly review preparation",
      }
      setDailyPlan(samplePlan)
    } else {
      setDailyPlan(null)
    }
  }

  const generateHourlySlots = (date: Date) => {
    const slots: { time: string; hour: number; events: CalendarEvent[]; isEmpty: boolean }[] = []
    const startOfDayDate = startOfDay(date)
    for (let i = CAL_HOUR_START; i < CAL_HOUR_END; i++) {
      const slotTime = addHours(startOfDayDate, i)
      const eventsInSlot = events.filter(
        (event) => isSameDay(event.startDate, date) && event.startDate.getHours() === i,
      )
      slots.push({
        time: format(slotTime, "HH:mm"),
        hour: i,
        events: eventsInSlot,
        isEmpty: eventsInSlot.length === 0,
      })
    }
    return slots
  }

  const weekHourRows = () => {
    const rows: number[] = []
    for (let h = CAL_HOUR_START; h < CAL_HOUR_END; h++) rows.push(h)
    return rows
  }

  const getWeekDays = (weekStart: Date) => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    return days
  }

  const scrollToTomorrow = () => {
    const tomorrow = addDays(selectedDate, 1)
    setSelectedDate(tomorrow)
    loadDailyPlan(tomorrow)
  }

  const getDateLabel = () => {
    const today = new Date()
    const tomorrow = addDays(today, 1)

    if (isSameDay(selectedDate, today)) {
      return "Today"
    } else if (isSameDay(selectedDate, tomorrow)) {
      return "Tomorrow"
    } else {
      return format(selectedDate, "MMMM d")
    }
  }

  const createMeetingBooking = () => {
    if (!newBooking.title || !newBooking.duration) return

    const booking: MeetingBooking = {
      id: Date.now().toString(),
      title: newBooking.title,
      duration: newBooking.duration,
      description: newBooking.description,
      availableSlots: generateTimeSlots(),
      bookingUrl: `https://calendly.com/user/${newBooking.title?.toLowerCase().replace(/\s+/g, "-")}`,
    }

    setMeetingBookings([...meetingBookings, booking])
    setNewBooking({})
    setIsCreatingBooking(false)
  }

  const getCategoryColor = (category: "work" | "personal" | "health" | "social" | "other") => {
    const colors = {
      work: "bg-blue-500",
      personal: "bg-green-500",
      health: "bg-orange-500",
      social: "bg-purple-500",
      other: "bg-gray-500",
    }
    return colors[category]
  }

  return (
    <div className="h-full overflow-hidden">
      <Tabs defaultValue="calendar" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="booking">Meeting Booking</TabsTrigger>
          <TabsTrigger value="routines">Routines</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) setCreateDraft(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New event</DialogTitle>
                <DialogDescription>Set the title and whether you are attending.</DialogDescription>
              </DialogHeader>
              {createDraft && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ev-title">Title</Label>
                    <Input
                      id="ev-title"
                      value={createDraft.title}
                      onChange={(e) => setCreateDraft({ ...createDraft, title: e.target.value })}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(createDraft.start, "EEE MMM d, h:mm a")} – {format(createDraft.end, "h:mm a")}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium text-sm">I am attending</div>
                      <div className="text-xs text-muted-foreground">Off = show faded (not attending)</div>
                    </div>
                    <Switch
                      checked={createDraft.attending}
                      onCheckedChange={(c) => setCreateDraft({ ...createDraft, attending: c })}
                    />
                  </div>
                  <Button className="w-full" onClick={() => void saveNewEvent()}>
                    Save event
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <div className="flex flex-wrap items-center gap-3 mb-3 px-1 py-2 rounded-lg border bg-muted/40">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", "wayward-new-event")
                e.dataTransfer.effectAllowed = "copy"
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background cursor-grab active:cursor-grabbing text-sm font-medium shadow-sm select-none"
            >
              <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
              Drag to create event
            </div>
            <p className="text-xs text-muted-foreground max-w-md">
              Drop on any hour cell in the week grid or day column. On the day view, drag the narrow strip beside
              times to select a multi-hour block.
            </p>
          </div>

          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            <div className="w-1/2 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-bold">{getDateLabel()}</h2>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={scrollToTomorrow}>
                  {isSameDay(selectedDate, new Date()) ? "Tomorrow" : format(addDays(selectedDate, 1), "MMM d")}
                </Button>
              </div>

              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="pb-2 shrink-0">
                  <CardTitle className="text-lg">{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-hidden p-2">
                  <ScrollArea className="h-[min(520px,55vh)]" ref={dailyScrollRef}>
                    <div className="space-y-0 pr-2">
                      {generateHourlySlots(selectedDate).map((slot) => {
                        const inRange =
                          rangePreview &&
                          slot.hour >= rangePreview.lo &&
                          slot.hour <= rangePreview.hi
                        return (
                          <div
                            key={slot.hour}
                            className={`flex items-stretch border-b border-border min-h-[52px] ${inRange ? "bg-blue-100/40 dark:bg-blue-950/30" : ""}`}
                            onPointerEnter={() => {
                              if (!rangeActiveRef.current || !rangeDragRef.current) return
                              rangeDragRef.current.endH = slot.hour
                              const lo = Math.min(rangeDragRef.current.startH, rangeDragRef.current.endH)
                              const hi = Math.max(rangeDragRef.current.startH, rangeDragRef.current.endH)
                              setRangePreview({ lo, hi })
                            }}
                          >
                            <div className="w-14 shrink-0 flex flex-col items-center pt-1 border-r border-dashed border-muted">
                              <span className="text-xs text-muted-foreground font-mono">{slot.time}</span>
                              <button
                                type="button"
                                className="mt-1 w-5 flex-1 min-h-8 rounded-sm bg-muted/60 hover:bg-muted border border-dashed border-muted-foreground/30 touch-none"
                                title="Drag down to select hours"
                                onPointerDown={(e) => {
                                  e.preventDefault()
                                  rangeActiveRef.current = true
                                  rangeDragRef.current = { startH: slot.hour, endH: slot.hour }
                                  setRangePreview({ lo: slot.hour, hi: slot.hour })
                                }}
                              />
                            </div>
                            <div
                              className="flex-1 pl-2 py-1 min-w-0"
                              onDragOver={handleDragOverGrid}
                              onDrop={(e) => {
                                e.preventDefault()
                                if (e.dataTransfer.getData("text/plain") !== "wayward-new-event") return
                                const start = setMinutes(setHours(startOfDay(selectedDate), slot.hour), 0)
                                openCreateDialog(start, addHours(start, 1))
                              }}
                            >
                              {slot.events.length > 0 ? (
                                <div className="space-y-2">
                                  {slot.events.map((event) => {
                                    const att = event.attending !== false
                                    return (
                                      <div
                                        key={event.id}
                                        className={`rounded-md border p-2 text-sm transition-opacity ${
                                          att
                                            ? "bg-blue-50 dark:bg-blue-950/40 border-l-4 border-l-blue-500 shadow-sm"
                                            : "opacity-50 bg-muted/30 border-dashed border-muted-foreground/25 text-muted-foreground"
                                        }`}
                                        onPointerDown={(e) => e.stopPropagation()}
                                      >
                                        <div className="font-medium">{event.title}</div>
                                        {event.description && (
                                          <div className="text-xs text-muted-foreground line-clamp-2">
                                            {event.description}
                                          </div>
                                        )}
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-muted-foreground">
                                          <span className="flex items-center">
                                            <ClockIcon className="h-3 w-3 mr-1 shrink-0" />
                                            {format(event.startDate, "h:mm a")}
                                            {event.endDate && ` – ${format(event.endDate, "h:mm a")}`}
                                          </span>
                                          {!att && (
                                            <Badge variant="outline" className="text-[10px] h-5">
                                              Not attending
                                            </Badge>
                                          )}
                                        </div>
                                        <div
                                          className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50"
                                          onClick={(ev) => ev.stopPropagation()}
                                        >
                                          <span className="text-xs text-muted-foreground">Attending</span>
                                          <Switch
                                            checked={att}
                                            onCheckedChange={(c) => void setEventAttending(event, c)}
                                          />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="h-full min-h-8 flex items-center text-xs text-muted-foreground/60">
                                  Drop event here
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="w-1/2 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-bold">
                    {format(currentWeek, "MMM d")} – {format(addDays(currentWeek, 6), "MMM d, yyyy")}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
                  <div className="min-w-[340px]">
                    <div className="flex border-b bg-muted/30 sticky top-0 z-10">
                      <div className="w-9 shrink-0" />
                      {getWeekDays(currentWeek).map((day, i) => (
                        <div
                          key={i}
                          className="flex-1 min-w-0 py-1 px-0.5 text-center border-l text-[10px] sm:text-xs"
                        >
                          <div className="text-muted-foreground">{format(day, "EEE")}</div>
                          <button
                            type="button"
                            className={`mt-0.5 font-medium rounded-full w-6 h-6 mx-auto flex items-center justify-center ${
                              isSameDay(day, selectedDate)
                                ? "bg-blue-500 text-white"
                                : isSameDay(day, new Date())
                                  ? "text-blue-600 font-bold"
                                  : ""
                            }`}
                            onClick={() => setSelectedDate(day)}
                          >
                            {format(day, "d")}
                          </button>
                        </div>
                      ))}
                    </div>
                    {weekHourRows().map((hour) => (
                      <div key={hour} className="flex border-b border-border/80 min-h-[40px]">
                        <div className="w-9 shrink-0 text-[10px] text-muted-foreground pr-0.5 pt-0.5 text-right font-mono">
                          {hour}
                        </div>
                        {getWeekDays(currentWeek).map((day, dayIndex) => {
                          const cellEvents = events.filter(
                            (ev) => isSameDay(ev.startDate, day) && ev.startDate.getHours() === hour,
                          )
                          return (
                            <div
                              key={`${hour}-${dayIndex}`}
                              className="flex-1 min-w-0 border-l border-border/60 p-0.5 hover:bg-muted/20 transition-colors"
                              onDragOver={handleDragOverGrid}
                              onDrop={(e) => {
                                e.preventDefault()
                                if (e.dataTransfer.getData("text/plain") !== "wayward-new-event") return
                                const d = addDays(currentWeek, dayIndex)
                                const start = setMinutes(setHours(startOfDay(d), hour), 0)
                                openCreateDialog(start, addHours(start, 1))
                              }}
                            >
                              <div className="space-y-0.5">
                                {cellEvents.map((event) => {
                                  const att = event.attending !== false
                                  return (
                                    <div
                                      key={event.id}
                                      className={`rounded px-0.5 py-0.5 text-[10px] leading-tight border ${
                                        att
                                          ? "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-200"
                                          : "opacity-45 bg-muted/50 text-muted-foreground border-dashed"
                                      }`}
                                      onClick={() => setSelectedDate(day)}
                                    >
                                      <div className="font-medium truncate">{event.title}</div>
                                      <div className="flex items-center justify-between gap-0.5 mt-0.5">
                                        <span className="opacity-80 truncate">{format(event.startDate, "h:mm")}</span>
                                        <span
                                          className="shrink-0"
                                          onPointerDown={(ev) => ev.stopPropagation()}
                                          onClick={(ev) => ev.stopPropagation()}
                                        >
                                          <Switch
                                            className="scale-[0.55] origin-right"
                                            checked={att}
                                            onCheckedChange={(c) => void setEventAttending(event, c)}
                                          />
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                  {dailyPlan &&
                    getWeekDays(currentWeek).some((d) => isSameDay(d, dailyPlan.date)) && (
                      <div className="p-2 text-xs text-muted-foreground border-t">
                        Routine blocks also appear on{" "}
                        {format(dailyPlan.date, "MMM d")} in the day column.
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="booking" className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Meeting Booking</h2>
            <Dialog open={isCreatingBooking} onOpenChange={setIsCreatingBooking}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Booking Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Meeting Booking</DialogTitle>
                  <DialogDescription>Set up a new meeting type for others to book</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Meeting Title</Label>
                    <Input
                      id="title"
                      value={newBooking.title || ""}
                      onChange={(e) => setNewBooking({ ...newBooking, title: e.target.value })}
                      placeholder="e.g., 30-minute Strategy Session"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select onValueChange={(value) => setNewBooking({ ...newBooking, duration: Number(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newBooking.description || ""}
                      onChange={(e) => setNewBooking({ ...newBooking, description: e.target.value })}
                      placeholder="Describe what this meeting is about"
                    />
                  </div>
                  <Button onClick={createMeetingBooking} className="w-full">
                    Create Booking Link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetingBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{booking.title}</CardTitle>
                      <CardDescription>
                        {booking.duration} minutes • {booking.availableSlots.filter((s) => s.available).length}{" "}
                        available slots
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <EditIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {booking.description && <p className="text-sm text-muted-foreground mb-4">{booking.description}</p>}

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Booking URL</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input value={booking.bookingUrl} readOnly className="text-xs" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(booking.bookingUrl)}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Available Times (Today)</Label>
                      <div className="grid grid-cols-4 gap-1 mt-2">
                        {booking.availableSlots.slice(0, 8).map((slot, index) => (
                          <Button
                            key={index}
                            variant={slot.available ? "outline" : "ghost"}
                            size="sm"
                            className={`text-xs ${
                              slot.available
                                ? "hover:bg-green-50 hover:border-green-300"
                                : "opacity-50 cursor-not-allowed"
                            }`}
                            disabled={!slot.available}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                      {booking.availableSlots.length > 8 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{booking.availableSlots.length - 8} more slots available
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {meetingBookings.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Meeting Types Created</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first meeting type to start accepting bookings from others
                </p>
                <Button onClick={() => setIsCreatingBooking(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Booking Link
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="routines" className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Daily Routines</h2>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Routine
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routines.map((routine) => (
              <Card key={routine.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{routine.name}</CardTitle>
                      <CardDescription>
                        {routine.timeBlocks.length} time blocks
                        {routine.isDefault && <Badge className="ml-2">Default</Badge>}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <EditIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {routine.timeBlocks.slice(0, 3).map((block) => (
                      <div key={block.id} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{block.title}</span>
                          <span className="text-muted-foreground">
                            {block.startTime} - {block.endTime}
                          </span>
                        </div>
                      </div>
                    ))}
                    {routine.timeBlocks.length > 3 && (
                      <div className="text-sm text-muted-foreground">+{routine.timeBlocks.length - 3} more blocks</div>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      Use Today
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
