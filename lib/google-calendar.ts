/**
 * /lib/google-calendar.ts
 * Google Calendar API wrapper. Reuses OAuth tokens from email_accounts table.
 */

import { supabaseAdmin } from "./supabase"
import type { BusinessId } from "@/types/db"

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
  recurrence?: string[]
  status?: string
}

async function getAccessToken(businessId: BusinessId): Promise<string | null> {
  const { data: account } = await supabaseAdmin
    .from("email_accounts")
    .select("access_token, refresh_token, token_expires_at, email_address")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .not("access_token", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!account?.access_token) return null

  // Refresh token if expired (with 60s buffer)
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0
  const needsRefresh = expiresAt - Date.now() < 60_000

  if (needsRefresh && account.refresh_token) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refresh_token,
        grant_type: "refresh_token",
      }),
    })

    if (res.ok) {
      const tokens = await res.json() as { access_token?: string; expires_in?: number }
      if (tokens.access_token) {
        const newExpiry = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null

        await supabaseAdmin
          .from("email_accounts")
          .update({ access_token: tokens.access_token, token_expires_at: newExpiry })
          .eq("email_address", account.email_address)

        return tokens.access_token
      }
    }
  }

  return account.access_token
}

export async function listEvents(
  businessId: BusinessId,
  timeMin: Date,
  timeMax: Date,
  calendarId = "primary",
): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken(businessId)
  if (!token) return []

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!res.ok) {
    console.error(`Calendar API error for ${businessId}:`, await res.text())
    return []
  }

  const data = await res.json() as { items?: GoogleCalendarEvent[] }
  return data.items ?? []
}

export async function createEvent(
  businessId: BusinessId,
  event: Omit<GoogleCalendarEvent, "id">,
  calendarId = "primary",
): Promise<GoogleCalendarEvent | null> {
  const token = await getAccessToken(businessId)
  if (!token) return null

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  )

  if (!res.ok) {
    console.error(`Create event error for ${businessId}:`, await res.text())
    return null
  }

  return res.json() as Promise<GoogleCalendarEvent>
}
