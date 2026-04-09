/**
 * /lib/linkedin.ts
 * LinkedIn API v2 client.
 * Auth: OAuth 2.0 — one app manages all business pages.
 */

const LI_BASE = "https://api.linkedin.com/v2"

async function liFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${LI_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      ...(options.headers ?? {}),
    },
  })
}

export interface LinkedInProfile {
  id: string
  localizedFirstName?: string
  localizedLastName?: string
  profilePicture?: unknown
}

export interface LinkedInOrg {
  id: string
  localizedName?: string
  vanityName?: string
}

export interface LinkedInPost {
  id?: string
  author: string       // urn:li:person:{id} or urn:li:organization:{id}
  lifecycleState: "PUBLISHED" | "DRAFT"
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: { text: string }
      shareMediaCategory: "NONE" | "ARTICLE" | "IMAGE"
      media?: Array<{
        status: "READY"
        description?: { text: string }
        originalUrl?: string
        title?: { text: string }
      }>
    }
  }
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" | "CONNECTIONS"
  }
}

// ── Profile ────────────────────────────────────────────────────────────────────

export async function getProfile(accessToken: string): Promise<LinkedInProfile | null> {
  const res = await liFetch(accessToken, "/me")
  if (!res.ok) return null
  return res.json() as Promise<LinkedInProfile>
}

export async function getOrganization(
  accessToken: string,
  vanityName: string,
): Promise<LinkedInOrg | null> {
  const res = await liFetch(
    accessToken,
    `/organizations?q=vanityName&vanityName=${encodeURIComponent(vanityName)}`,
  )
  if (!res.ok) return null
  const data = await res.json() as { elements?: LinkedInOrg[] }
  return data.elements?.[0] ?? null
}

// ── Posts ──────────────────────────────────────────────────────────────────────

export async function createPost(
  accessToken: string,
  authorUrn: string,
  text: string,
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
): Promise<{ id: string } | null> {
  const body: LinkedInPost = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": visibility,
    },
  }

  const res = await liFetch(accessToken, "/ugcPosts", {
    method: "POST",
    body: JSON.stringify(body),
  })

  if (!res.ok) return null
  const data = await res.json() as { id?: string }
  return data.id ? { id: data.id } : null
}

export async function getPostEngagement(
  accessToken: string,
  postUrn: string,
): Promise<{ likes: number; comments: number; shares: number; impressions: number } | null> {
  const encoded = encodeURIComponent(postUrn)
  const res = await liFetch(accessToken, `/socialActions/${encoded}`)
  if (!res.ok) return null
  const data = await res.json() as Record<string, unknown>
  return {
    likes: (data.likesSummary as Record<string, number>)?.totalLikes ?? 0,
    comments: (data.commentsSummary as Record<string, number>)?.totalFirstLevelComments ?? 0,
    shares: (data.shareStatistics as Record<string, number>)?.shareCount ?? 0,
    impressions: (data.impressionCount as number) ?? 0,
  }
}

// ── OAuth helpers ──────────────────────────────────────────────────────────────

export function buildOAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) throw new Error("LINKEDIN_CLIENT_ID not configured")

  const scopes = [
    "r_liteprofile",
    "r_emailaddress",
    "w_member_social",
    "r_organization_social",
    "w_organization_social",
    "rw_organization_admin",
  ].join(" ")

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
  })

  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) return null
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

// ── Character limits ───────────────────────────────────────────────────────────

export const PLATFORM_LIMITS: Record<string, number> = {
  linkedin:  3000,
  twitter:   280,
  instagram: 2200,
}

export const PLATFORM_IDEAL: Record<string, number> = {
  linkedin:  300,
  twitter:   240,
  instagram: 150,
}
