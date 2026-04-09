import { NextResponse } from "next/server"
import { streamClaude, BUSINESS_NAMES, BUSINESS_TONES } from "@/lib/claude"
import type { BusinessId, ModuleId } from "@/lib/claude"
import { getRelevantMemories, formatMemoriesForPrompt } from "@/lib/memory"
import {
  isWikiMemoryEnabled,
  wikiPagesDirHasContent,
  loadWikiMemoryForPrompt,
  logWikiObservation,
} from "@/lib/wiki-context"
import type { ModuleContext } from "@/lib/claude-context-builder"
import { buildSystemPrompt } from "@/lib/claude-context-builder"
import { COMMAND_CENTER_SYSTEM_APPENDIX } from "@/lib/command-center"

export interface ClaudeRequestBody {
  message?: string                // single-turn (background jobs)
  messages?: Array<{ role: "user" | "assistant"; content: string }>  // multi-turn (chat)
  business_id?: BusinessId | "all"
  module?: ModuleId
  include_memory?: boolean
  stream?: boolean
  moduleContext?: ModuleContext    // cross-module data snapshot from client
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable chat.",
          code: "MISSING_API_KEY",
        },
        { status: 503 },
      )
    }

    const body: ClaudeRequestBody = await request.json()

    const {
      message,
      messages: rawMessages,
      business_id = "all",
      module: moduleName = "chat",
      include_memory = true,
      stream = true,
      moduleContext = {},
    } = body

    // Build message array
    const messages: Array<{ role: "user" | "assistant"; content: string }> =
      rawMessages ??
      (message ? [{ role: "user", content: message }] : [])

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "No message provided", code: "MISSING_MESSAGE" },
        { status: 400 },
      )
    }

    // ── Inject memory: wiki/pages (filesystem-first) or Neo4j fallback ─────
    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? ""

    let memoryText = "(no memories yet)"
    if (include_memory) {
      let useNeo4jFallback = true
      if (isWikiMemoryEnabled() && (await wikiPagesDirHasContent())) {
        try {
          const wikiResult = await loadWikiMemoryForPrompt({
            businessId: business_id,
            module: moduleName,
            userMessage: lastUserMessage,
          })
          if (wikiResult.usedWiki && wikiResult.text.length > 0) {
            memoryText = wikiResult.text
            useNeo4jFallback = false
            void logWikiObservation({
              at: new Date().toISOString(),
              businessId: business_id,
              module: moduleName,
              injectedPaths: wikiResult.injectedPaths,
              charCount: wikiResult.text.length,
              source: "wiki",
            })
          }
        } catch (wikiErr) {
          console.error("loadWikiMemoryForPrompt failed (falling back to Neo4j memory):", wikiErr)
        }
      }
      if (useNeo4jFallback) {
        try {
          const memories = await getRelevantMemories(
            business_id === "all" ? "ollacart" : business_id,
            moduleName,
            lastUserMessage,
          )
          memoryText = formatMemoriesForPrompt(memories)
        } catch (memErr) {
          console.error("getRelevantMemories failed (continuing without Neo4j memory):", memErr)
          memoryText = formatMemoriesForPrompt([])
        }
      }
    }

    // ── Build system prompt ────────────────────────────────────────────────
    const now = new Date()
    const dateStr = now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })

    const businessContext =
      business_id === "all"
        ? "All businesses (SwiftFi, UnbeatableLoans, OllaCart)"
        : BUSINESS_NAMES[business_id]

    const tone =
      business_id !== "all" ? `\nTone for this business: ${BUSINESS_TONES[business_id]}` : ""

    // Base system prompt from spec
    const basePrompt = `You are Dash, an AI chief of staff for a founder managing three startups:
SwiftFi (crypto onramp, swiftfi.com — revenue-generating), UnbeatableLoans (mortgage app, unbeatableloans.com), and OllaCart (social shopping cart, ollacart.com — Rye API integration in progress).

Current date/time: ${dateStr}
Active business: ${businessContext}
Active module: ${moduleName}${tone}

RULES:
- Always tag responses with the relevant business when context is specific
- Surface the 3-5 most important actions, not everything
- When drafting emails or messages, match the tone of that business
- SwiftFi tone: modern, fast, fintech-forward
- UnbeatableLoans tone: professional, trustworthy, mortgage-industry standard
- OllaCart tone: friendly, social, community-driven
- Never mix up business contexts in a single response
- Flag when something is urgent vs. can wait
- Lead with the answer or action — no filler

--- MEMORY CONTEXT ---
${memoryText}

${COMMAND_CENTER_SYSTEM_APPENDIX}`

    // Append cross-module data (tasks, calendar, etc.) from client snapshot
    const fullSystemPrompt =
      Object.keys(moduleContext).length > 0
        ? buildSystemPrompt("founder", moduleContext) + "\n\n" + basePrompt
        : basePrompt

    // ── Stream response ────────────────────────────────────────────────────
    if (stream) {
      const maxTokens = moduleName === "email" || moduleName === "vc" ? 4096 : 2048
      const streamMessages = messages
      const streamSystem = fullSystemPrompt

      const readable = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          const sendError = (message: string) => {
            const line = `data: ${JSON.stringify({ error: message })}\n\n`
            controller.enqueue(encoder.encode(line))
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          }
          try {
            const claudeStream = await streamClaude({
              messages: streamMessages,
              systemPrompt: streamSystem,
              maxTokens,
            })
            for await (const chunk of claudeStream) {
              if (
                chunk.type === "content_block_delta" &&
                chunk.delta.type === "text_delta"
              ) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`,
                  ),
                )
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (err) {
            console.error("Claude stream error:", err)
            const message =
              err instanceof Error ? err.message : "Anthropic stream failed"
            try {
              sendError(message)
            } catch {
              /* stream may already be closed */
            }
          }
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      })
    }

    // ── Non-streaming (background jobs) ───────────────────────────────────
    const { callClaude } = await import("@/lib/claude")
    const { text } = await callClaude({
      messages,
      systemPrompt: fullSystemPrompt,
      maxTokens: 4096,
    })

    return NextResponse.json({ text })
  } catch (error) {
    console.error("Claude route error:", error)
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    )
  }
}
