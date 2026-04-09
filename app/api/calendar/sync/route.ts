import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { listEvents } from "@/lib/google-calendar"
import { callClaude } from "@/lib/claude"
import type { BusinessId } from "@/types/db"

const BUSINESSES: BusinessId[] = ["swiftfi", "unbeatableloans", "ollacart"]

const EVENT_TYPE_PROMPT = `Classify this calendar event into one of these types:
investor_meeting, dev_sync, customer_call, internal, personal, pitch, other

Return ONLY the type string, nothing else.`

/**
 * POST /api/calendar/sync
 * Syncs Google Calendar events for all connected business accounts.
 * Runs every 30 minutes as a background job.
 */
export async function POST() {
  const timeMin = new Date()
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead

  const results: Array<{ business: string; synced: number; errors: number }> = []

  for (const businessId of BUSINESSES) {
    let synced = 0
    let errors = 0

    try {
      const events = await listEvents(businessId, timeMin, timeMax)

      for (const event of events) {
        if (!event.id || !event.summary) continue

        // Skip if already saved
        const { data: existing } = await supabaseAdmin
          .from("calendar_events")
          .select("id")
          .eq("google_event_id", event.id)
          .single()

        if (existing) continue

        try {
          // Get account email for this business
          const { data: account } = await supabaseAdmin
            .from("email_accounts")
            .select("email_address")
            .eq("business_id", businessId)
            .limit(1)
            .single()

          // Ask Claude to classify event type
          let eventType = "other"
          try {
            const { text } = await callClaude({
              messages: [
                {
                  role: "user",
                  content: `Event: "${event.summary}"\nAttendees: ${event.attendees?.map((a) => a.email).join(", ") ?? "none"}\nDescription: ${event.description ?? "none"}`,
                },
              ],
              systemPrompt: EVENT_TYPE_PROMPT,
              maxTokens: 20,
            })
            const classified = text.trim().toLowerCase()
            const valid = ["investor_meeting","dev_sync","customer_call","internal","personal","pitch","other"]
            if (valid.includes(classified)) eventType = classified
          } catch {
            // keep "other" if Claude fails
          }

          const startTime = event.start.dateTime ?? event.start.date ?? new Date().toISOString()
          const endTime = event.end.dateTime ?? event.end.date ?? startTime

          await supabaseAdmin.from("calendar_events").insert({
            business_id: businessId,
            google_event_id: event.id,
            calendar_account: account?.email_address ?? businessId,
            title: event.summary,
            description: event.description ?? null,
            location: event.location ?? null,
            start_time: startTime,
            end_time: endTime,
            attendees: event.attendees ?? null,
            event_type: eventType,
            is_recurring: (event.recurrence?.length ?? 0) > 0,
          })

          // Auto-create prep task for external meetings
          const hasExternalAttendees = (event.attendees?.length ?? 0) > 0
          if (
            hasExternalAttendees &&
            ["investor_meeting", "customer_call", "pitch", "dev_sync"].includes(eventType)
          ) {
            const eventDate = new Date(startTime)
            const prepDue = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]

            await supabaseAdmin.from("tasks").insert({
              business_id: businessId,
              title: `Prep for: ${event.summary}`,
              description: `Meeting on ${eventDate.toLocaleDateString()}. Attendees: ${event.attendees?.map((a) => a.email).join(", ")}`,
              priority: eventType === "investor_meeting" || eventType === "pitch" ? "high" : "medium",
              category: eventType === "investor_meeting" || eventType === "pitch" ? "pitch" : "ops",
              source: "calendar",
              due_date: prepDue,
            })
          }

          synced++
        } catch (eventErr) {
          console.error(`Error syncing event ${event.id}:`, eventErr)
          errors++
        }
      }
    } catch (bizErr) {
      console.error(`Error syncing calendar for ${businessId}:`, bizErr)
      errors++
    }

    results.push({ business: businessId, synced, errors })
  }

  return NextResponse.json({ results, synced_at: new Date().toISOString() })
}
