"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, PlusIcon, TrashIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ScheduleItem {
  id: string
  title: string
  date: Date
  startTime: string
  endTime: string
}

export default function ScheduleForm() {
  const router = useRouter()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [items, setItems] = useState<ScheduleItem[]>([
    {
      id: "1",
      title: "",
      date: new Date(),
      startTime: "",
      endTime: "",
    },
  ])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        title: "",
        date: date || new Date(),
        startTime: "",
        endTime: "",
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof ScheduleItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // In a real app, you would save this to your backend
    console.log("Schedule items:", items)

    toast({
      title: "Schedule Created",
      description: "Your schedule has been created successfully.",
    })

    router.push("/")
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Schedule</CardTitle>
          <CardDescription>Add events to your schedule and visualize your day</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Schedule Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="space-y-2 p-4 border rounded-md">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`title-${item.id}`}>Event {index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    id={`title-${item.id}`}
                    placeholder="Event title"
                    value={item.title}
                    onChange={(e) => updateItem(item.id, "title", e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`start-${item.id}`}>Start Time</Label>
                      <Input
                        id={`start-${item.id}`}
                        type="time"
                        value={item.startTime}
                        onChange={(e) => updateItem(item.id, "startTime", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end-${item.id}`}>End Time</Label>
                      <Input
                        id={`end-${item.id}`}
                        type="time"
                        value={item.endTime}
                        onChange={(e) => updateItem(item.id, "endTime", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button type="submit">Create Schedule</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
