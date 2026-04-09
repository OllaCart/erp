"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CalendarDaysIcon, CheckSquareIcon, InboxIcon, MapPinIcon, MessageSquareIcon, RefreshCwIcon } from "lucide-react"
import type { DbTask } from "@/types/db"
import { dispatchWaywardNavigate } from "@/lib/wayward-shell-events"
import { LocationService, type LocationData, type LocationPost } from "@/lib/location-service"

interface TodayEventRow {
  id: string
  title: string
  start_time: string
}

interface EmailPreviewRow {
  id: string
  subject: string | null
  from_address: string | null
  is_read: boolean
}

function go(tab: string) {
  dispatchWaywardNavigate(tab)
}

export const HomeOverview: React.FC = () => {
  const locationService = LocationService.getInstance()

  const [tasks, setTasks] = useState<DbTask[] | null>(null)
  const [tasksErr, setTasksErr] = useState<string | null>(null)
  const [events, setEvents] = useState<TodayEventRow[] | null>(null)
  const [eventsErr, setEventsErr] = useState<string | null>(null)
  const [emails, setEmails] = useState<EmailPreviewRow[] | null>(null)
  const [emailsErr, setEmailsErr] = useState<string | null>(null)

  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [locationPosts, setLocationPosts] = useState<LocationPost[]>([])
  const [locationErr, setLocationErr] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  const load = useCallback(async () => {
    setTasksErr(null)
    setEventsErr(null)
    setEmailsErr(null)

    try {
      const tr = await fetch("/api/tasks?limit=8")
      const tj = await tr.json().catch(() => ({}))
      if (!tr.ok) {
        setTasksErr(typeof tj.error === "string" ? tj.error : "Could not load tasks")
        setTasks([])
      } else {
        setTasks((tj.tasks as DbTask[]) ?? [])
      }
    } catch {
      setTasksErr("Could not load tasks")
      setTasks([])
    }

    try {
      const er = await fetch("/api/calendar/today")
      const ej = await er.json().catch(() => ({}))
      if (!er.ok) {
        setEventsErr(typeof ej.error === "string" ? ej.error : "Could not load calendar")
        setEvents([])
      } else {
        setEvents((ej.events as TodayEventRow[]) ?? [])
      }
    } catch {
      setEventsErr("Could not load calendar")
      setEvents([])
    }

    try {
      const mr = await fetch("/api/email/list?limit=5")
      const mj = await mr.json().catch(() => ({}))
      if (!mr.ok) {
        setEmailsErr(typeof mj.error === "string" ? mj.error : "Could not load email")
        setEmails([])
      } else {
        setEmails((mj.emails as EmailPreviewRow[]) ?? [])
      }
    } catch {
      setEmailsErr("Could not load email")
      setEmails([])
    }
  }, [])

  const refreshLocation = useCallback(async () => {
    setLocationLoading(true)
    setLocationErr(null)
    try {
      const loc = await locationService.getCurrentLocation()
      setLocation(loc)
      const label = await locationService.reverseGeocode(loc.latitude, loc.longitude)
      setLocationLabel(label)
      const posts = await locationService.getLocationPosts(loc)
      setLocationPosts(posts)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not read location"
      setLocationErr(msg)
      setLocation(null)
      setLocationLabel(null)
      setLocationPosts([])
    } finally {
      setLocationLoading(false)
    }
  }, [locationService])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void refreshLocation()
  }, [refreshLocation])

  const openTasks = tasks?.filter((t) => t.status !== "done" && t.status !== "archived") ?? []
  const topTasks = openTasks.slice(0, 5)

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    } catch {
      return iso
    }
  }

  const mapEmbedSrc =
    location != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.012}%2C${location.latitude - 0.008}%2C${location.longitude + 0.012}%2C${location.latitude + 0.008}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`
      : null

  const mapsLink =
    location != null
      ? `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`
      : null

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Snapshots across your stack — open a module for full context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="default" size="sm" onClick={() => go("chat")}>
            <MessageSquareIcon className="h-4 w-4 mr-1.5" />
            Chat
          </Button>
          <Button variant="outline" size="sm" onClick={() => go("tasks")}>
            Tasks
          </Button>
          <Button variant="outline" size="sm" onClick={() => go("email")}>
            Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => go("dash")}>
            <MapPinIcon className="h-4 w-4 mr-1.5" />
            Voice & location
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="pb-2 flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-primary" />
              Near you
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={locationLoading}
            onClick={() => void refreshLocation()}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-1.5 ${locationLoading ? "animate-spin" : ""}`} />
            Refresh location
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {locationLoading && !location ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : locationErr ? (
            <p className="text-sm text-muted-foreground">
              {locationErr}. Allow location in the browser, or open{" "}
              <button type="button" className="text-primary underline" onClick={() => go("dash")}>
                Voice
              </button>{" "}
              to try again.
            </p>
          ) : location ? (
            <>
              {mapEmbedSrc ? (
                <div className="rounded-lg overflow-hidden border bg-muted/30 aspect-[21/9] min-h-[160px] max-h-[220px]">
                  <iframe
                    title="Map near your location"
                    className="w-full h-full border-0"
                    src={mapEmbedSrc}
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{locationLabel ?? "Your position"}</span>
                  <span className="mx-1.5">·</span>
                  <span className="font-mono text-xs">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </span>
                </p>
                {mapsLink ? (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Open in OpenStreetMap
                  </a>
                ) : null}
              </div>

              {locationPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No nearby posts yet.</p>
              ) : (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Nearby posts
                  </p>
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {locationPosts.map((post) => {
                      const distKm = locationService.calculateDistance(location, post.location)
                      const distLabel = distKm < 0.1 ? "< 100 m" : `${distKm.toFixed(2)} km`
                      return (
                        <li
                          key={post.id}
                          className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col"
                        >
                          <div
                            className={`grid gap-0.5 bg-muted ${
                              post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                            }`}
                          >
                            {post.mediaUrls.slice(0, 4).map((url) => (
                              <div key={url} className="relative aspect-video w-full bg-muted">
                                <Image
                                  src={url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, 200px"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                          <div className="p-3 flex flex-col gap-2 flex-1">
                            <p className="text-sm leading-snug">{post.content}</p>
                            <div className="flex flex-wrap gap-1 mt-auto">
                              {post.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              <Badge variant="outline" className="text-xs">
                                {distLabel}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {post.timestamp.toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquareIcon className="h-4 w-4" />
                Tasks
              </CardTitle>
              <CardDescription>Open work (not done)</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => go("tasks")}>
              Open
            </Button>
          </CardHeader>
          <CardContent>
            {tasks === null ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : tasksErr ? (
              <p className="text-sm text-muted-foreground">{tasksErr}</p>
            ) : topTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks — you&apos;re clear or Supabase is empty.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topTasks.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span className="font-medium line-clamp-2">{t.title}</span>
                    <span className="text-muted-foreground shrink-0 text-xs uppercase">{t.priority}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4" />
                Today
              </CardTitle>
              <CardDescription>Calendar events</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => go("calendar")}>
              Open
            </Button>
          </CardHeader>
          <CardContent>
            {events === null ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : eventsErr ? (
              <p className="text-sm text-muted-foreground">{eventsErr}</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing on the calendar today.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {events.slice(0, 6).map((ev) => (
                  <li key={ev.id} className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span className="line-clamp-2">{ev.title}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">{formatTime(ev.start_time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <InboxIcon className="h-4 w-4" />
                Recent email
              </CardTitle>
              <CardDescription>Newest messages across accounts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => go("email")}>
              Inbox
            </Button>
          </CardHeader>
          <CardContent>
            {emails === null ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : emailsErr ? (
              <p className="text-sm text-muted-foreground">{emailsErr}</p>
            ) : emails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages synced yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {emails.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <span className={`line-clamp-1 ${m.is_read ? "text-muted-foreground" : "font-medium"}`}>
                      {m.subject || "(no subject)"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{m.from_address || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
