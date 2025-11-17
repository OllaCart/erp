"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  UsersIcon,
  PlusIcon,
  CalendarIcon,
  DollarSignIcon,
  MapPinIcon,
  ClockIcon,
  HeartIcon,
  MessageCircleIcon,
  InstagramIcon,
  TwitterIcon,
  FacebookIcon,
  LinkedinIcon,
  StarIcon,
  TrendingUpIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import type { Contact, SocialActivity, RelationshipType, ActivityType } from "@/types/erp"
import { format, isSameWeek } from "date-fns"

interface SocialEvent {
  id: string
  title: string
  description: string
  date: Date
  location?: string
  attendees: string[]
  type: "upcoming" | "suggested"
  category: ActivityType
  estimatedCost?: number
  rsvpStatus?: "pending" | "accepted" | "declined"
}

export const SocialDashboard: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activities, setActivities] = useState<SocialActivity[]>([])
  const [socialEvents, setSocialEvents] = useState<SocialEvent[]>([])
  const [newContact, setNewContact] = useState<Partial<Contact>>({})
  const [newActivity, setNewActivity] = useState<Partial<SocialActivity>>({})
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [isAddingActivity, setIsAddingActivity] = useState(false)

  const userId = "user-123"

  useEffect(() => {
    // Load sample data
    const sampleContacts: Contact[] = [
      {
        id: "1",
        userId,
        name: "Sarah Johnson",
        email: "sarah@example.com",
        phone: "+1-555-0123",
        relationshipType: "friend",
        birthday: new Date("1990-05-15"),
        lastContact: new Date("2024-01-15"),
        notes: "Met at college, loves hiking and photography",
        socialAccounts: [
          { platform: "Instagram", username: "@sarahj_photos", profileUrl: "https://instagram.com/sarahj_photos" },
          { platform: "LinkedIn", username: "sarah-johnson", profileUrl: "https://linkedin.com/in/sarah-johnson" },
        ],
        tags: ["college", "photography", "hiking"],
        importance: 4,
      },
      {
        id: "2",
        userId,
        name: "Mike Chen",
        email: "mike.chen@company.com",
        relationshipType: "colleague",
        lastContact: new Date("2024-01-20"),
        notes: "Project manager, great at organizing team events",
        socialAccounts: [
          { platform: "LinkedIn", username: "mike-chen-pm", profileUrl: "https://linkedin.com/in/mike-chen-pm" },
        ],
        tags: ["work", "project-management"],
        importance: 3,
      },
      {
        id: "3",
        userId,
        name: "Emma Rodriguez",
        email: "emma.r@email.com",
        relationshipType: "family",
        birthday: new Date("1985-12-03"),
        lastContact: new Date("2024-01-18"),
        notes: "Sister, lives in Portland, works in marketing",
        socialAccounts: [
          { platform: "Facebook", username: "emma.rodriguez", profileUrl: "https://facebook.com/emma.rodriguez" },
          { platform: "Twitter", username: "@emmar_marketing", profileUrl: "https://twitter.com/emmar_marketing" },
        ],
        tags: ["family", "marketing", "portland"],
        importance: 5,
      },
    ]

    const sampleActivities: SocialActivity[] = [
      {
        id: "1",
        userId,
        title: "Coffee with Sarah",
        description: "Catch up over coffee at the new cafe downtown",
        type: "social",
        estimatedCost: 15,
        duration: 90,
        location: "Downtown Cafe",
        participants: ["Sarah Johnson"],
        suggestedDate: new Date("2024-01-25T10:00:00"),
        tags: ["coffee", "catch-up"],
      },
      {
        id: "2",
        userId,
        title: "Team Happy Hour",
        description: "After-work drinks with colleagues",
        type: "social",
        estimatedCost: 40,
        duration: 120,
        location: "Murphy's Pub",
        participants: ["Mike Chen", "Team"],
        suggestedDate: new Date("2024-01-26T17:30:00"),
        tags: ["work", "team-building"],
      },
      {
        id: "3",
        userId,
        title: "Art Gallery Opening",
        description: "New contemporary art exhibition opening",
        type: "cultural",
        estimatedCost: 25,
        duration: 180,
        location: "City Art Gallery",
        suggestedDate: new Date("2024-01-27T19:00:00"),
        tags: ["art", "culture", "evening"],
      },
    ]

    const sampleSocialEvents: SocialEvent[] = [
      {
        id: "1",
        title: "Sarah's Birthday Party",
        description: "Celebrating Sarah's birthday at her place",
        date: new Date("2024-01-28T19:00:00"),
        location: "Sarah's House",
        attendees: ["Sarah Johnson", "Mike Chen", "Emma Rodriguez"],
        type: "upcoming",
        category: "social",
        estimatedCost: 30,
        rsvpStatus: "accepted",
      },
      {
        id: "2",
        title: "Company Retreat",
        description: "Annual company retreat and team building",
        date: new Date("2024-02-05T09:00:00"),
        location: "Mountain Resort",
        attendees: ["Mike Chen", "Team"],
        type: "upcoming",
        category: "social",
        estimatedCost: 200,
        rsvpStatus: "pending",
      },
      {
        id: "3",
        title: "Weekend Hiking Trip",
        description: "Explore the local trails with friends",
        date: new Date("2024-01-29T08:00:00"),
        location: "Blue Ridge Trail",
        attendees: ["Sarah Johnson"],
        type: "suggested",
        category: "outdoor",
        estimatedCost: 50,
      },
      {
        id: "4",
        title: "Wine Tasting Event",
        description: "Local winery hosting a tasting event",
        date: new Date("2024-02-03T18:00:00"),
        location: "Valley Winery",
        attendees: ["Emma Rodriguez"],
        type: "suggested",
        category: "social",
        estimatedCost: 45,
      },
      {
        id: "5",
        title: "Photography Workshop",
        description: "Learn advanced photography techniques",
        date: new Date("2024-02-10T14:00:00"),
        location: "Community Center",
        attendees: ["Sarah Johnson"],
        type: "suggested",
        category: "cultural",
        estimatedCost: 75,
      },
    ]

    setContacts(sampleContacts)
    setActivities(sampleActivities)
    setSocialEvents(sampleSocialEvents)
  }, [])

  const addContact = () => {
    if (newContact.name) {
      const contact: Contact = {
        id: Date.now().toString(),
        userId,
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        relationshipType: newContact.relationshipType || "acquaintance",
        birthday: newContact.birthday,
        notes: newContact.notes,
        socialAccounts: [],
        tags: [],
        importance: newContact.importance || 3,
        lastContact: new Date(),
      }
      setContacts([...contacts, contact])
      setNewContact({})
      setIsAddingContact(false)
    }
  }

  const addActivity = () => {
    if (newActivity.title) {
      const activity: SocialActivity = {
        id: Date.now().toString(),
        userId,
        title: newActivity.title!,
        description: newActivity.description || "",
        type: newActivity.type || "social",
        estimatedCost: newActivity.estimatedCost || 0,
        duration: newActivity.duration || 60,
        location: newActivity.location,
        participants: newActivity.participants || [],
        suggestedDate: newActivity.suggestedDate,
        tags: newActivity.tags || [],
      }
      setActivities([...activities, activity])
      setNewActivity({})
      setIsAddingActivity(false)
    }
  }

  const updateEventRSVP = (eventId: string, status: "accepted" | "declined") => {
    setSocialEvents(socialEvents.map((event) => (event.id === eventId ? { ...event, rsvpStatus: status } : event)))
  }

  const getRelationshipBadge = (type: RelationshipType) => {
    const colors = {
      family: "bg-red-100 text-red-800",
      friend: "bg-green-100 text-green-800",
      colleague: "bg-blue-100 text-blue-800",
      acquaintance: "bg-gray-100 text-gray-800",
      romantic: "bg-pink-100 text-pink-800",
      professional: "bg-purple-100 text-purple-800",
    }
    return <Badge className={colors[type]}>{type}</Badge>
  }

  const getActivityTypeBadge = (type: ActivityType) => {
    const colors = {
      social: "bg-green-100 text-green-800",
      entertainment: "bg-purple-100 text-purple-800",
      fitness: "bg-orange-100 text-orange-800",
      cultural: "bg-blue-100 text-blue-800",
      outdoor: "bg-emerald-100 text-emerald-800",
      dining: "bg-yellow-100 text-yellow-800",
      shopping: "bg-pink-100 text-pink-800",
    }
    return <Badge className={colors[type]}>{type}</Badge>
  }

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram":
        return <InstagramIcon className="h-4 w-4" />
      case "twitter":
        return <TwitterIcon className="h-4 w-4" />
      case "facebook":
        return <FacebookIcon className="h-4 w-4" />
      case "linkedin":
        return <LinkedinIcon className="h-4 w-4" />
      default:
        return <MessageCircleIcon className="h-4 w-4" />
    }
  }

  const getRSVPBadge = (status?: "pending" | "accepted" | "declined") => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
      case "declined":
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default:
        return null
    }
  }

  const upcomingEvents = socialEvents.filter((event) => event.type === "upcoming")
  const suggestedEvents = socialEvents.filter((event) => event.type === "suggested")

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="contacts" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="suggested">Suggested</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Contacts & Relationships</h2>
            <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>Add a new person to your network</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newContact.name || ""}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContact.email || ""}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newContact.phone || ""}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="relationship">Relationship Type</Label>
                    <Select
                      onValueChange={(value) =>
                        setNewContact({ ...newContact, relationshipType: value as RelationshipType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="colleague">Colleague</SelectItem>
                        <SelectItem value="acquaintance">Acquaintance</SelectItem>
                        <SelectItem value="romantic">Romantic</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newContact.notes || ""}
                      onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                      placeholder="Add notes about this person"
                    />
                  </div>
                  <Button onClick={addContact} className="w-full">
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${contact.name.charAt(0)}`} />
                      <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{contact.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {getRelationshipBadge(contact.relationshipType)}
                        <div className="flex">
                          {Array.from({ length: contact.importance }, (_, i) => (
                            <HeartIcon key={i} className="h-3 w-3 fill-red-500 text-red-500" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {contact.email && <p className="text-sm text-muted-foreground mb-1">{contact.email}</p>}
                  {contact.phone && <p className="text-sm text-muted-foreground mb-2">{contact.phone}</p>}
                  {contact.lastContact && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Last contact: {contact.lastContact.toLocaleDateString()}
                    </p>
                  )}
                  {contact.socialAccounts && contact.socialAccounts.length > 0 && (
                    <div className="flex space-x-2 mb-2">
                      {contact.socialAccounts.map((account, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          {getSocialIcon(account.platform)}
                          <span className="text-xs">{account.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {contact.notes && <p className="text-sm text-muted-foreground">{contact.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Upcoming Events</h2>

          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground">Your social calendar is clear for now</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription>{event.description}</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getActivityTypeBadge(event.category)}
                          {getRSVPBadge(event.rsvpStatus)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(event.date, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </div>
                        {event.location && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        )}
                        {event.estimatedCost && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <DollarSignIcon className="h-4 w-4 mr-2" />${event.estimatedCost}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <UsersIcon className="h-4 w-4 mr-2" />
                          {event.attendees.join(", ")}
                        </div>
                      </div>

                      {event.rsvpStatus === "pending" && (
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" onClick={() => updateEventRSVP(event.id, "accepted")} className="flex-1">
                            <CheckIcon className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateEventRSVP(event.id, "declined")}
                            className="flex-1"
                          >
                            <XIcon className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggested" className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Suggested Events</h2>
          <p className="text-muted-foreground">AI-powered event suggestions based on your interests and friends</p>

          <div className="space-y-4">
            {suggestedEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {event.title}
                        <StarIcon className="h-4 w-4 ml-2 text-yellow-500" />
                      </CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </div>
                    {getActivityTypeBadge(event.category)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(event.date, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {event.location}
                      </div>
                    )}
                    {event.estimatedCost && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <DollarSignIcon className="h-4 w-4 mr-2" />${event.estimatedCost}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <UsersIcon className="h-4 w-4 mr-2" />
                      Suggested with: {event.attendees.join(", ")}
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button size="sm" className="flex-1">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      <MessageCircleIcon className="h-4 w-4 mr-2" />
                      Invite Friends
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Activity Ideas</h2>
            <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Activity</DialogTitle>
                  <DialogDescription>Create a new social activity or event</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newActivity.title || ""}
                      onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                      placeholder="Enter activity title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newActivity.description || ""}
                      onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                      placeholder="Describe the activity"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Activity Type</Label>
                    <Select onValueChange={(value) => setNewActivity({ ...newActivity, type: value as ActivityType })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="dining">Dining</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost">Estimated Cost ($)</Label>
                      <Input
                        id="cost"
                        type="number"
                        value={newActivity.estimatedCost || ""}
                        onChange={(e) => setNewActivity({ ...newActivity, estimatedCost: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newActivity.duration || ""}
                        onChange={(e) => setNewActivity({ ...newActivity, duration: Number(e.target.value) })}
                        placeholder="60"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newActivity.location || ""}
                      onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                      placeholder="Enter location"
                    />
                  </div>
                  <Button onClick={addActivity} className="w-full">
                    Add Activity
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((activity) => (
              <Card key={activity.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{activity.title}</CardTitle>
                      <CardDescription>{activity.description}</CardDescription>
                    </div>
                    {getActivityTypeBadge(activity.type)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <DollarSignIcon className="h-4 w-4 mr-2" />${activity.estimatedCost}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      {activity.duration} minutes
                    </div>
                    {activity.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {activity.location}
                      </div>
                    )}
                    {activity.suggestedDate && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {activity.suggestedDate.toLocaleDateString()} at{" "}
                        {activity.suggestedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {activity.participants && activity.participants.length > 0 && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        {activity.participants.join(", ")}
                      </div>
                    )}
                  </div>
                  <Button className="w-full mt-4 bg-transparent" variant="outline">
                    Schedule Activity
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Social Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Contacts:</span>
                    <span className="font-semibold">{contacts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Family:</span>
                    <span>{contacts.filter((c) => c.relationshipType === "family").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Friends:</span>
                    <span>{contacts.filter((c) => c.relationshipType === "friend").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Colleagues:</span>
                    <span>{contacts.filter((c) => c.relationshipType === "colleague").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>This Week:</span>
                    <span className="font-semibold">
                      {upcomingEvents.filter((e) => isSameWeek(e.date, new Date())).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending RSVPs:</span>
                    <span>{upcomingEvents.filter((e) => e.rsvpStatus === "pending").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Suggested Events:</span>
                    <span>{suggestedEvents.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Upcoming Events:</span>
                    <span className="font-semibold">
                      ${upcomingEvents.reduce((sum, e) => sum + (e.estimatedCost || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Suggested Activities:</span>
                    <span>${activities.reduce((sum, a) => sum + a.estimatedCost, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Week:</span>
                    <span>
                      $
                      {upcomingEvents
                        .filter((e) => isSameWeek(e.date, new Date()))
                        .reduce((sum, e) => sum + (e.estimatedCost || 0), 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social Activity Trends</CardTitle>
              <CardDescription>Your social engagement patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Social Activity Increasing</span>
                  </div>
                  <span className="text-sm text-muted-foreground">+25% this month</span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    You haven't contacted Sarah in 7 days - consider reaching out!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Emma's birthday is coming up in 2 weeks - plan something special
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3 new activity suggestions based on your schedule and interests
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
