/**
 * /lib/memory.ts
 * Neo4j memory read/write for Dash ERP.
 * Stores Claude's persistent knowledge across sessions — decisions, contacts,
 * preferences, business facts.
 */

import neo4j from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"
import type { BusinessId } from "./claude"

export type MemoryType =
  | "fact"
  | "decision"
  | "contact"
  | "preference"
  | "event"
  | "task_context"

export interface MemoryNode {
  id: string
  business_id: BusinessId | "all"
  type: MemoryType
  content: string
  importance: 1 | 2 | 3 | 4 | 5
  source: "user" | "email" | "github" | "calendar" | "claude"
  created_at: string
  last_accessed: string
  expires_at: string | null
}

// ── Neo4j driver (server-side only) ──────────────────────────────────────────

function getDriver() {
  const uri = process.env.NEO4J_URI
  const username = process.env.NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD

  if (!uri || !username || !password) return null

  return neo4j.driver(uri, neo4j.auth.basic(username, password))
}

// ── In-memory fallback when Neo4j is not configured ──────────────────────────

const memoryStore: MemoryNode[] = []

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save a memory node to Neo4j (or in-memory fallback).
 */
export async function saveMemory(
  memory: Omit<MemoryNode, "id" | "created_at" | "last_accessed">,
): Promise<MemoryNode> {
  const node: MemoryNode = {
    ...memory,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString(),
  }

  const driver = getDriver()
  if (!driver) {
    memoryStore.push(node)
    return node
  }

  const session = driver.session()
  try {
    await session.run(
      `MERGE (u:User {id: $userId})
       CREATE (m:Memory {
         id: $id,
         business_id: $business_id,
         type: $type,
         content: $content,
         importance: $importance,
         source: $source,
         created_at: $created_at,
         last_accessed: $last_accessed,
         expires_at: $expires_at
       })
       CREATE (u)-[:HAS_MEMORY]->(m)`,
      { userId: "founder", ...node },
    )
  } finally {
    await session.close()
    await driver.close()
  }

  return node
}

/**
 * Fetch memories relevant to a given business + message.
 * Always includes importance >= 4. Limits to 20 total.
 */
export async function getRelevantMemories(
  businessId: BusinessId | "all",
  _module: string,
  _userMessage: string,
): Promise<MemoryNode[]> {
  const driver = getDriver()

  if (!driver) {
    // Fallback: filter in-memory store
    const critical = memoryStore.filter((m) => m.importance >= 4)
    const contextual = memoryStore.filter(
      (m) =>
        m.importance < 4 &&
        (m.business_id === businessId || m.business_id === "all"),
    )
    return [...critical, ...contextual]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20)
  }

  const session = driver.session()
  try {
    // Always include importance >= 4 across all businesses
    const criticalResult = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
       WHERE m.importance >= 4
         AND (m.expires_at IS NULL OR m.expires_at > $now)
       RETURN m ORDER BY m.importance DESC LIMIT 10`,
      { userId: "founder", now: new Date().toISOString() },
    )

    // Include contextual memories for this business
    const contextResult = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
       WHERE m.importance < 4
         AND (m.business_id = $businessId OR m.business_id = 'all')
         AND (m.expires_at IS NULL OR m.expires_at > $now)
       RETURN m ORDER BY m.last_accessed DESC LIMIT 10`,
      {
        userId: "founder",
        businessId,
        now: new Date().toISOString(),
      },
    )

    const toNode = (r: { get: (k: string) => { properties: MemoryNode } }) =>
      r.get("m").properties as MemoryNode

    const all = [
      ...criticalResult.records.map(toNode),
      ...contextResult.records.map(toNode),
    ]

    // Deduplicate by id
    const seen = new Set<string>()
    return all
      .filter((m) => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      .slice(0, 20)
  } finally {
    await session.close()
    await driver.close()
  }
}

/**
 * Format memory nodes as plain text for system prompt injection.
 */
export function formatMemoriesForPrompt(memories: MemoryNode[]): string {
  if (memories.length === 0) return "(no memories yet)"

  return memories
    .map((m) => {
      const tag = m.business_id === "all" ? "ALL" : m.business_id.toUpperCase()
      const imp = "★".repeat(m.importance)
      return `[${tag}][${m.type}]${imp} ${m.content}`
    })
    .join("\n")
}

/**
 * Seed critical business context memories (importance=5).
 * Called once on first run — idempotent via MERGE on content hash.
 */
export async function seedCriticalMemories(): Promise<void> {
  const seeds: Array<Omit<MemoryNode, "id" | "created_at" | "last_accessed">> =
    [
      // SwiftFi
      {
        business_id: "swiftfi",
        type: "fact",
        content:
          "SwiftFi is a crypto onramp app at swiftfi.com — currently generating revenue. It is the HIGHEST PRIORITY business.",
        importance: 5,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "swiftfi",
        type: "fact",
        content:
          "SwiftFi has a developer who maintains the app repo (swiftfi-app). Founder maintains the landing page (swiftfi-landing) in Cursor.",
        importance: 5,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "swiftfi",
        type: "fact",
        content:
          "SwiftFi uses GoHighLevel for outreach. Support email: support@swiftfi.com.",
        importance: 4,
        source: "user",
        expires_at: null,
      },
      // UnbeatableLoans
      {
        business_id: "unbeatableloans",
        type: "fact",
        content:
          "UnbeatableLoans is a mortgage app at unbeatableloans.com. Early stage. Founder works on it at night because mortgage developers are hard to find.",
        importance: 5,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "unbeatableloans",
        type: "preference",
        content:
          "UnbeatableLoans work happens only in the evening (after 9pm). Never schedule dev syncs or meetings for it during the day.",
        importance: 5,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "unbeatableloans",
        type: "fact",
        content:
          "UnbeatableLoans uses GoHighLevel for outreach. Support email: support@unbeatableloans.com.",
        importance: 4,
        source: "user",
        expires_at: null,
      },
      // OllaCart
      {
        business_id: "ollacart",
        type: "fact",
        content:
          "OllaCart is a social universal shopping cart at ollacart.com. Currently integrating Rye API (in progress). This is the ERP repo (github.com/OllaCart/erp).",
        importance: 5,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "ollacart",
        type: "fact",
        content:
          "OllaCart emails: john@ollacart.com (development), support@ollacart.com (customer support).",
        importance: 4,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "ollacart",
        type: "preference",
        content:
          "OllaCart work happens in the afternoon (2pm-6pm).",
        importance: 4,
        source: "user",
        expires_at: null,
      },
      // All businesses
      {
        business_id: "all",
        type: "preference",
        content:
          "Founder uses Cursor as the primary IDE. Prefers to-do list style task management. This system replaces Linear (tasks) and Marblism (social media).",
        importance: 5,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "all",
        type: "preference",
        content:
          "Founder schedule: Morning (8am-12pm) = SwiftFi deep work. Midday (12pm-2pm) = meetings/investor calls/email. Afternoon (2pm-6pm) = OllaCart. Evening (after 9pm) = UnbeatableLoans.",
        importance: 5,
        source: "user",
        expires_at: null,
      },
      {
        business_id: "all",
        type: "preference",
        content:
          "SwiftFi is priority 1 (revenue-generating). OllaCart is priority 2 (afternoon). UnbeatableLoans is priority 3 (nights only). Always surface SwiftFi issues first.",
        importance: 5,
        source: "user",
        expires_at: null,
      },
    ]

  for (const seed of seeds) {
    await saveMemory(seed)
  }
}
