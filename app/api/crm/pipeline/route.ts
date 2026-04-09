import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { listPipelines, DEFAULT_STAGES } from "@/lib/ghl"

/**
 * GET /api/crm/pipeline
 * Returns pipeline stages with contact counts for a business.
 * Falls back to default stages if GHL is not connected.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id") ?? "swiftfi"

  // Try GHL for live stages
  let stages: string[] = []
  try {
    const pipelines = await listPipelines(business_id)
    if (pipelines.length > 0) {
      stages = pipelines[0].stages.map((s) => s.name)
    }
  } catch { /* GHL not configured */ }

  // Fall back to defaults
  if (stages.length === 0) {
    stages = DEFAULT_STAGES[business_id] ?? ["New Lead", "Contacted", "Converted", "Lost"]
  }

  // Get contacts grouped by stage
  const { data: contacts } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, first_name, last_name, company, contact_type, pipeline_stage, last_activity_at, email, ghl_contact_id")
    .eq("business_id", business_id)

  // Group into kanban columns
  const columns = stages.map((stage) => {
    const stageContacts = (contacts ?? []).filter((c) => c.pipeline_stage === stage)
    return {
      stage,
      contacts: stageContacts.map((c) => ({
        ...c,
        days_in_stage: c.last_activity_at
          ? Math.floor((Date.now() - new Date(c.last_activity_at).getTime()) / 86400000)
          : null,
      })),
      count: stageContacts.length,
    }
  })

  // Unassigned contacts (no stage set)
  const unassigned = (contacts ?? []).filter((c) => !c.pipeline_stage || !stages.includes(c.pipeline_stage))

  return NextResponse.json({ columns, unassigned, stages, business_id })
}
