import { NextResponse } from "next/server"
import { seedCriticalMemories } from "@/lib/memory"

/**
 * POST /api/seed
 * Seeds the 12 critical business context memories into Neo4j.
 * Run once after Neo4j credentials are configured.
 * Protected by a simple secret to prevent accidental re-runs.
 */
export async function POST(request: Request) {
  const { secret } = await request.json().catch(() => ({ secret: "" }))

  if (secret !== process.env.ANTHROPIC_API_KEY?.slice(-8)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  try {
    await seedCriticalMemories()
    return NextResponse.json({ ok: true, message: "Critical memories seeded successfully." })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ error: "Seed failed", code: "SEED_FAILED" }, { status: 500 })
  }
}
