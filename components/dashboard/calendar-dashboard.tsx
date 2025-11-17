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
import { format, addDays, startOfWeek, addWeeks, isSameDay, addHours, startOfDay } from "date-fns"
import { ClockIcon, PlusIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, LinkIcon } from "lucide-react"

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

  const userId = "user-123"

  useEffect(() => {
    const fetchEvents = async () => {
      const userEvents = await CalendarService.getUserEvents(userId)
      setEvents(userEvents)
      loadDailyPlan(selectedDate)
    }

    fetchEvents()
    loadRoutines()
    loadMeetingBookings()
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
    const slots = []
    const startOfDayDate = startOfDay(date)

    for (let i = 0; i < 24; i++) {
      const slotTime = addHours(startOfDayDate, i)
      const eventsInSlot = events.filter((event) => {
        const eventHour = event.startDate.getHours()
        return isSameDay(event.startDate, date) && eventHour === i
      })

      slots.push({
        time: format(slotTime, "HH:mm"),
        hour: i,
        events: eventsInSlot,
        isEmpty: eventsInSlot.length === 0,
      })
    }

    return slots
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

        <TabsContent value="calendar" className="flex-1 overflow-hidden">
          <div className="h-full flex gap-4">
            {/* Daily View - Left Side */}
            <div className="w-1/2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
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

              <Card className="flex-1 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-hidden">
                  <ScrollArea className="h-full" ref={dailyScrollRef}>
                    <div className="space-y-1">
                      {generateHourlySlots(selectedDate).map((slot) => (
                        <div key={slot.hour} className="flex items-start border-b border-gray-100 py-2">
                          <div className="w-16 text-sm text-muted-foreground font-mono">{slot.time}</div>
                          <div className="flex-1 ml-4">
                            {slot.events.length > 0 ? (
                              <div className="space-y-1">
                                {slot.events.map((event) => (
                                  <div key={event.id} className="p-2 rounded-md bg-blue-50 border-l-4 border-blue-500">
                                    <div className="font-medium text-sm">{event.title}</div>
                                    {event.description && (
                                      <div className="text-xs text-muted-foreground">{event.description}</div>
                                    )}
                                    <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                      <ClockIcon className="h-3 w-3 mr-1" />
                                      {format(event.startDate, "h:mm a")}
                                      {event.endDate && ` - ${format(event.endDate, "h:mm a")}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-8 flex items-center">
                                <div className="w-full border-t border-dashed border-gray-200"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Weekly View - Right Side */}
            <div className="w-1/2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-bold">
                    {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Card className="flex-1 overflow-hidden">
                <CardContent className="h-full p-0">
                  <div className="h-full flex">
                    {getWeekDays(currentWeek).map((day, dayIndex) => (
                      <div key={dayIndex} className="flex-1 border-r border-gray-200 last:border-r-0">
                        <div className="p-2 border-b border-gray-200 text-center">
                          <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                          <div
                            className={`text-sm font-medium ${
                              isSameDay(day, selectedDate)
                                ? "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto"
                                : isSameDay(day, new Date())
                                  ? "text-blue-600 font-bold"
                                  : ""
                            }`}
                            onClick={() => setSelectedDate(day)}
                          >
                            {format(day, "d")}
                          </div>
                        </div>
                        <ScrollArea className="h-full">
                          <div className="p-1 space-y-1">
                            {events
                              .filter((event) => isSameDay(event.startDate, day))
                              .map((event) => (
                                <div
                                  key={event.id}
                                  className="p-1 rounded text-xs bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                                  onClick={() => setSelectedDate(day)}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  <div className="text-xs opacity-75">{format(event.startDate, "h:mm a")}</div>
                                </div>
                              ))}
                            {dailyPlan &&
                              isSameDay(day, dailyPlan.date) &&
                              dailyPlan.customBlocks.map((block) => (
                                <div
                                  key={block.id}
                                  className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 ${getCategoryColor(
                                    block.category,
                                  )} text-white`}
                                  onClick={() => setSelectedDate(day)}
                                >
                                  <div className="font-medium truncate">{block.title}</div>
                                  <div className="text-xs opacity-75">
                                    {block.startTime} - {block.endTime}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
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
