import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { listContacts, listPipelines, listOpportunities } from "@/lib/ghl"

const GHL_BUSINESSES = ["swiftfi", "unbeatableloans", "ollacart"]

/**
 * POST /api/crm/sync
 * Syncs contacts and pipeline data from all GHL sub-accounts into Supabase.
 * Run daily at 7am or on-demand from CRM UI.
 */
export async function POST() {
  const results: Array<{
    business: string
    contacts_synced: number
    pipeline_synced: boolean
    error?: string
  }> = []

  for (const businessId of GHL_BUSINESSES) {
    let contactsSynced = 0
    let pipelineSynced = false

    try {
      // Fetch and upsert contacts
      const contacts = await listContacts(businessId, { limit: 100 })

      for (const c of contacts) {
        await supabaseAdmin.from("crm_contacts").upsert(
          {
            business_id: businessId,
            ghl_contact_id: c.id,
            first_name: c.firstName ?? null,
            last_name: c.lastName ?? null,
            email: c.email ?? null,
            phone: c.phone ?? null,
            company: c.companyName ?? null,
            tags: c.tags ?? [],
            last_activity_at: c.lastActivity ?? null,
            source: "ghl_sync",
          },
          { onConflict: "ghl_contact_id" },
        )
        contactsSynced++
      }

      // Fetch pipelines and update stages
      const pipelines = await listPipelines(businessId)
      for (const pipeline of pipelines) {
        const opportunities = await listOpportunities(businessId, pipeline.id)

        // Build stage name map from pipeline
        const stageMap = Object.fromEntries(pipeline.stages.map((s) => [s.id, s.name]))

        for (const opp of opportunities) {
          if (!opp.contactId) continue
          const stageName = opp.pipelineStageId ? (stageMap[opp.pipelineStageId] ?? opp.pipelineStageId) : null

          await supabaseAdmin
            .from("crm_contacts")
            .update({
              pipeline_stage: stageName,
              pipeline_id: pipeline.id,
              opportunity_id: opp.id,
            })
            .eq("ghl_contact_id", opp.contactId)
            .eq("business_id", businessId)
        }
        pipelineSynced = true
      }

      // Auto-create follow-up tasks for stale contacts (last_activity > 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: staleContacts } = await supabaseAdmin
        .from("crm_contacts")
        .select("id, first_name, last_name, company, pipeline_stage")
        .eq("business_id", businessId)
        .lt("last_activity_at", sevenDaysAgo)
        .not("pipeline_stage", "in", '("Converted","Funded","Customer","Lost","Churned","Closed")')
        .limit(10)

      for (const contact of staleContacts ?? []) {
        const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company || "Contact"
        // Check if follow-up task already exists
        const { data: existing } = await supabaseAdmin
          .from("tasks")
          .select("id")
          .eq("source_id", contact.id)
          .eq("status", "todo")
          .single()

        if (!existing) {
          await supabaseAdmin.from("tasks").insert({
            business_id: businessId,
            title: `Follow up with ${name}`,
            description: `No activity in 7+ days. Current stage: ${contact.pipeline_stage ?? "unknown"}`,
            priority: "medium",
            category: "outreach",
            source: "claude",
            source_id: contact.id,
          })
        }
      }
    } catch (err) {
      results.push({ business: businessId, contacts_synced: contactsSynced, pipeline_synced: false, error: String(err) })
      continue
    }

    results.push({ business: businessId, contacts_synced: contactsSynced, pipeline_synced: pipelineSynced })
  }

  return NextResponse.json({ results, synced_at: new Date().toISOString() })
}
