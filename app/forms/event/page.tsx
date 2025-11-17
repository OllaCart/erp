"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarService } from "@/lib/calendar-service"
import type { EventType } from "@/types/erp"
import { toast } from "@/components/ui/use-toast"

export default function EventForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "meeting" as EventType,
    startDate: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
    startTime: "09:00",
    endDate: "",
    endTime: "",
    location: "",
    participants: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value as EventType }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Create start date with time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)

      // Create end date with time if provided
      let endDateTime: Date | undefined
      if (formData.endDate && formData.endTime) {
        endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
      } else if (formData.endTime) {
        // If only end time is provided, use start date
        endDateTime = new Date(`${formData.startDate}T${formData.endTime}`)
      }

      // Parse participants
      const participants = formData.participants
        ? formData.participants
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined

      await CalendarService.addEvent({
        userId: "user-123", // In a real app, get from auth
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        startDate: startDateTime,
        endDate: endDateTime,
        location: formData.location || undefined,
        participants,
      })

      toast({
        title: "Event Created",
        description: "Your event has been successfully scheduled.",
      })

      router.push("/")
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Schedule an Event</CardTitle>
          <CardDescription>Add a new event to your calendar</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="What's the event?"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add more details about this event"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Event Type</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time (Optional)</Label>
                <Input id="endTime" name="endTime" type="time" value={formData.endTime} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                name="location"
                placeholder="Where is this event taking place?"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">Participants (Optional)</Label>
              <Input
                id="participants"
                name="participants"
                placeholder="Comma-separated list of participants"
                value={formData.participants}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Event"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
