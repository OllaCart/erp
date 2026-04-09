import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * POST /api/webhooks/ghl
 * Receives inbound webhooks from GoHighLevel.
 *
 * Configure in GHL → Settings → Integrations → Webhooks:
 *   URL: https://your-domain.vercel.app/api/webhooks/ghl
 *   Events: Contact Create, Contact Update, Opportunity Stage Update,
 *           Form Submitted, Appointment Booked, Campaign Step Completed
 *
 * GHL sends a shared secret in the header: x-ghl-signature (optional)
 * Pass ?business_id=swiftfi in the URL to identify which sub-account triggered it.
 *
 * GHL webhook event types:
 *   ContactCreate, ContactUpdate, ContactDelete
 *   OpportunityCreate, OpportunityStageUpdate
 *   FormSubmitted, AppointmentBooked
 *   NoteCreate
 *   TaskCreate, TaskComplete
 *   InboundMessage (SMS/email/Instagram DM/FB message received in GHL)
 *   OutboundMessage
 *   ConversationUnread
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id") ?? "unknown"

  // Validate shared secret if configured
  const secret = process.env.GHL_WEBHOOK_SECRET
  if (secret) {
    const sig = request.headers.get("x-ghl-signature") ?? ""
    if (sig !== secret) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType = (payload.type ?? payload.event ?? "unknown") as string
  const ghlContactId = (payload.contactId ?? payload.id ?? null) as string | null

  // Store raw webhook event
  const { data: savedEvent } = await supabaseAdmin
    .from("ghl_webhook_events")
    .insert({
      business_id,
      event_type: eventType,
      ghl_contact_id: ghlContactId,
      payload,
    })
    .select("id")
    .single()

  // Process the event
  await processGhlEvent(business_id, eventType, ghlContactId, payload)

  if (savedEvent) {
    await supabaseAdmin
      .from("ghl_webhook_events")
      .update({ processed: true })
      .eq("id", savedEvent.id)
  }

  return NextResponse.json({ ok: true, event_type: eventType })
}

async function processGhlEvent(
  businessId: string,
  eventType: string,
  ghlContactId: string | null,
  payload: Record<string, unknown>,
) {
  switch (eventType) {
    case "ContactCreate":
    case "ContactUpdate": {
      if (!ghlContactId) break
      const contact = payload.contact as Record<string, unknown> | undefined
      const data = contact ?? payload

      await supabaseAdmin.from("crm_contacts").upsert(
        {
          business_id: businessId,
          ghl_contact_id: ghlContactId,
          first_name: (data.firstName ?? data.first_name ?? null) as string | null,
          last_name: (data.lastName ?? data.last_name ?? null) as string | null,
          email: (data.email ?? null) as string | null,
          phone: (data.phone ?? null) as string | null,
          company: (data.companyName ?? data.company ?? null) as string | null,
          tags: (data.tags ?? []) as string[],
          last_activity_at: new Date().toISOString(),
          source: "webhook",
        },
        { onConflict: "ghl_contact_id" },
      )
      break
    }

    case "OpportunityStageUpdate": {
      if (!ghlContactId) break
      const stageName = (payload.stage ?? payload.pipelineStage ?? null) as string | null
      const opportunityId = (payload.opportunityId ?? payload.id ?? null) as string | null

      if (stageName) {
        await supabaseAdmin
          .from("crm_contacts")
          .update({
            pipeline_stage: stageName,
            opportunity_id: opportunityId,
            last_activity_at: new Date().toISOString(),
          })
          .eq("ghl_contact_id", ghlContactId)
          .eq("business_id", businessId)
      }
      break
    }

    case "FormSubmitted": {
      // New lead from a GHL form — create contact + task
      const formData = payload as Record<string, unknown>
      const email = (formData.email ?? formData.contact_email ?? null) as string | null
      const name = (formData.name ?? formData.full_name ?? null) as string | null
      const formName = (formData.form_name ?? formData.formName ?? "GHL Form") as string

      if (email || ghlContactId) {
        const { data: existing } = await supabaseAdmin
          .from("crm_contacts")
          .select("id")
          .eq("business_id", businessId)
          .eq(ghlContactId ? "ghl_contact_id" : "email", ghlContactId ?? email ?? "")
          .single()

        if (!existing) {
          await supabaseAdmin.from("crm_contacts").insert({
            business_id: businessId,
            ghl_contact_id: ghlContactId,
            email,
            first_name: name?.split(" ")[0] ?? null,
            last_name: name?.split(" ").slice(1).join(" ") || null,
            contact_type: "lead",
            source: "webhook",
            last_activity_at: new Date().toISOString(),
          })
        }

        await supabaseAdmin.from("tasks").insert({
          business_id: businessId,
          title: `New lead from ${formName}: ${name ?? email ?? "unknown"}`,
          description: `Form submitted via GHL. Contact: ${email ?? ghlContactId ?? "unknown"}`,
          priority: "high",
          category: "outreach",
          source: "email",
        })
      }
      break
    }

    case "AppointmentBooked": {
      const apptContact = (payload.contact ?? payload.contactId) as string | undefined
      const apptTitle = (payload.title ?? payload.appointmentTitle ?? "GHL Appointment") as string
      const startTime = (payload.startTime ?? payload.start_time ?? null) as string | null

      try {
        await supabaseAdmin.from("tasks").insert({
          business_id: businessId,
          title: `Prep for appointment: ${apptTitle}`,
          description: `Appointment booked via GHL${startTime ? ` for ${new Date(startTime).toLocaleString()}` : ""}. Contact: ${apptContact ?? "unknown"}`,
          priority: "high",
          category: "outreach",
          source: "calendar",
        })
      } catch (e) { console.error(e) }
      break
    }

    case "InboundMessage": {
      const channel = (payload.channel ?? payload.type ?? "message") as string
      const messageBody = (payload.body ?? payload.message ?? payload.text ?? "") as string
      const fromName = (payload.contactName ?? payload.from ?? "Unknown") as string

      try {
        await supabaseAdmin.from("tasks").insert({
          business_id: businessId,
          title: `Reply to ${channel} from ${fromName}`,
          description: String(messageBody).slice(0, 300),
          priority: "high",
          category: "outreach",
          source: "email",
          source_id: ghlContactId ?? undefined,
        })
      } catch (e) { console.error(e) }
      break
    }

    case "ConversationUnread": {
      const convChannel = (payload.channel ?? "conversation") as string
      const convContact = (payload.contactName ?? payload.contactId ?? "unknown") as string

      try {
        await supabaseAdmin.from("tasks").insert({
          business_id: businessId,
          title: `Unread ${convChannel} from ${convContact} in GHL`,
          priority: "medium",
          category: "outreach",
          source: "email",
          source_id: ghlContactId ?? undefined,
        })
      } catch (e) { console.error(e) }
      break
    }

    default:
      // Unknown event type — logged but not acted on
      break
  }
}
