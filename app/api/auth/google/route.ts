import { NextResponse } from "next/server"
import { cookies } from "next/headers"

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const popup = searchParams.get("popup") === "1"

  const state = crypto.randomUUID()
  const jar = await cookies()
  if (popup) {
    jar.set("google_oauth_popup", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    })
  } else {
    jar.set("google_oauth_popup", "", { maxAge: 0, path: "/" })
  }

  // Store business_id in state so callback knows which account to update
  const business_id = searchParams.get("business_id") ?? "ollacart"
  const stateData = JSON.stringify({ nonce: state, business_id })
  const stateB64 = Buffer.from(stateData).toString("base64url")

  jar.set("google_oauth_state", stateB64, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })

  const redirectUri = `${baseUrl()}/api/auth/google/callback`
  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
  ].join(" ")

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: stateB64,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
