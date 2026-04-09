import { cookies } from "next/headers"

interface GmailMessage {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  labelIds: string[]
}

/**
 * GET /api/sync/gmail
 * Fetches recent Gmail messages using the user's Google OAuth token.
 * The token is stored in the wayward_gmail_oauth cookie after linking.
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const oauthCookie = cookieStore.get("wayward_gmail_oauth")

    // Always 200 + messages[] so chat context gathering never trips 401 in the browser.
    if (!oauthCookie) {
      return Response.json({
        messages: [] as GmailMessage[],
        linked: false,
        hint: "Link Google in Settings to include inbox in chat context.",
      })
    }

    let oauthData: { access_token?: string }
    try {
      oauthData = JSON.parse(oauthCookie.value)
    } catch {
      return Response.json({
        messages: [] as GmailMessage[],
        linked: false,
        hint: "Invalid session cookie. Re-link Google in Settings.",
      })
    }

    const accessToken = oauthData.access_token
    if (!accessToken) {
      return Response.json({
        messages: [] as GmailMessage[],
        linked: false,
        hint: "No access token. Re-link your Google account in Settings.",
      })
    }

    // Fetch message list from Gmail API
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )

    if (!listRes.ok) {
      let details: unknown = null
      try {
        details = await listRes.json()
      } catch {
        /* ignore */
      }
      return Response.json({
        messages: [] as GmailMessage[],
        linked: true,
        gmailError: listRes.status,
        hint:
          listRes.status === 401
            ? "Gmail token expired. Re-link Google in Settings."
            : "Gmail API request failed; chat will continue without inbox context.",
        details,
      })
    }

    const listData = await listRes.json()
    const messageIds: string[] = (listData.messages || []).map((m: { id: string }) => m.id)

    // Fetch message headers in parallel (limited to 10 for speed)
    const messages: GmailMessage[] = await Promise.all(
      messageIds.slice(0, 10).map(async (id) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )

        if (!msgRes.ok) return null

        const msg = await msgRes.json()
        const headers: Array<{ name: string; value: string }> = msg.payload?.headers || []

        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ""

        return {
          id: msg.id,
          subject: getHeader("Subject") || "(no subject)",
          from: getHeader("From") || "",
          snippet: msg.snippet || "",
          date: getHeader("Date") || "",
          labelIds: msg.labelIds || [],
        }
      }),
    ).then((msgs) => msgs.filter(Boolean) as GmailMessage[])

    return Response.json({ messages })
  } catch (error) {
    console.error("Gmail sync error:", error)
    return Response.json({ error: "Failed to sync Gmail" }, { status: 500 })
  }
}
