/**
 * /lib/claude.ts
 * Single entry point for all Claude API calls in Dash ERP.
 * Never call Anthropic directly from routes or components — always use this.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages"

export type BusinessId = "swiftfi" | "unbeatableloans" | "ollacart" | "personal"
export type ModuleId =
  | "tasks"
  | "email"
  | "calendar"
  | "dev"
  | "support"
  | "vc"
  | "finance"
  | "social"
  | "crm"
  | "chat"

const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6"
const DEFAULT_MAX_TOKENS = 1024
const DRAFT_MAX_TOKENS = 4096

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface CallClaudeOptions {
  messages: MessageParam[]
  systemPrompt: string
  maxTokens?: number
  stream?: boolean
}

export interface CallClaudeResult {
  text: string
}

/**
 * Non-streaming Claude call. Returns the full text response.
 * Use for background jobs, email categorization, task creation, etc.
 */
export async function callClaude({
  messages,
  systemPrompt,
  maxTokens = DEFAULT_MAX_TOKENS,
}: Omit<CallClaudeOptions, "stream">): Promise<CallClaudeResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  })

  const text =
    response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("") ?? ""

  return { text }
}

/**
 * Streaming Claude call. Returns an Anthropic Stream you can iterate over.
 * Use for chat UI responses.
 */
export async function streamClaude({
  messages,
  systemPrompt,
  maxTokens = DEFAULT_MAX_TOKENS,
}: Omit<CallClaudeOptions, "stream">) {
  return client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  })
}

/**
 * Convenience: call Claude for drafting (email, pitch, spec).
 * Uses higher token limit.
 */
export async function callClaudeDraft(
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  const { text } = await callClaude({
    messages: [{ role: "user", content: prompt }],
    systemPrompt,
    maxTokens: DRAFT_MAX_TOKENS,
  })
  return text
}

/**
 * Convenience: call Claude expecting a JSON response.
 * Wraps the call and parses the result.
 */
export async function callClaudeJSON<T>(
  prompt: string,
  systemPrompt: string,
): Promise<T> {
  const { text } = await callClaude({
    messages: [{ role: "user", content: prompt }],
    systemPrompt,
    maxTokens: DRAFT_MAX_TOKENS,
  })

  const cleaned = text.trim().replace(/```json\n?|\n?```/g, "")
  return JSON.parse(cleaned) as T
}

/** Business display names for prompt construction. */
export const BUSINESS_NAMES: Record<BusinessId, string> = {
  swiftfi: "SwiftFi (crypto onramp, swiftfi.com — revenue-generating)",
  unbeatableloans: "UnbeatableLoans (mortgage app, unbeatableloans.com — early stage)",
  ollacart: "OllaCart (social shopping cart, ollacart.com — Rye API integration in progress)",
  personal: "Personal (founder's personal accounts)",
}

/** Business tones for email/content drafting. */
export const BUSINESS_TONES: Record<BusinessId, string> = {
  swiftfi: "modern, fast, fintech-forward",
  unbeatableloans: "professional, trustworthy, mortgage-industry standard",
  ollacart: "friendly, social, community-driven",
  personal: "casual, direct, personal",
}
