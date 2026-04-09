import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase"

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
}

type GoogleUserInfo = {
  id: string
  email: string
  name?: string
  picture?: string
}

type GoogleTokens = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const err = url.searchParams.get("error")
  if (err) {
    const desc = url.searchParams.get("error_description") || err
    return NextResponse.redirect(`${baseUrl()}/?gmail_oauth_error=${encodeURIComponent(desc)}`)
  }

  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const jar = await cookies()
  const saved = jar.get("google_oauth_state")?.value
  const popup = jar.get("google_oauth_popup")?.value === "1"

  jar.set("google_oauth_state", "", { maxAge: 0, path: "/" })
  jar.set("google_oauth_popup", "", { maxAge: 0, path: "/" })

  if (!code || !state || !saved || state !== saved) {
    return NextResponse.redirect(`${baseUrl()}/?gmail_oauth_error=${encodeURIComponent("Invalid OAuth state")}`)
  }

  // Decode business_id from state
  let business_id = "ollacart"
  try {
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString())
    business_id = stateData.business_id ?? "ollacart"
  } catch {
    // fallback to ollacart
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl()}/?gmail_oauth_error=${encodeURIComponent("OAuth not configured")}`)
  }

  const redirectUri = `${baseUrl()}/api/auth/google/callback`
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${baseUrl()}/?gmail_oauth_error=${encodeURIComponent("Token exchange failed")}`,
    )
  }

  const tokens = (await tokenRes.json()) as GoogleTokens
  if (!tokens.access_token) {
    return NextResponse.redirect(`${baseUrl()}/?gmail_oauth_error=${encodeURIComponent("No access token")}`)
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userRes.ok) {
    return NextResponse.redirect(`${baseUrl()}/?gmail_oauth_error=${encodeURIComponent("User info failed")}`)
  }

  const user = (await userRes.json()) as GoogleUserInfo
  if (!user.email || !user.id) {
    return NextResponse.redirect(`${baseUrl()}/?gmail_oauth_error=${encodeURIComponent("Missing email from Google")}`)
  }

  // Save tokens to Supabase email_accounts table
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  await supabaseAdmin
    .from("email_accounts")
    .upsert(
      {
        business_id,
        email_address: user.email,
        display_name: user.name ?? user.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        is_active: true,
      },
      { onConflict: "email_address" },
    )
    .select()

  const payload = {
    email: user.email,
    name: user.name,
    picture: user.picture,
    googleSub: user.id,
    business_id,
    linkedAt: new Date().toISOString(),
  }

  const origin = baseUrl()

  if (popup) {
    const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64")
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Linked</title></head><body>
<script>
(function(){
  try {
    var p = JSON.parse(atob(${JSON.stringify(b64)}));
    var targetOrigin = ${JSON.stringify(origin)};
    try {
      if (window.opener && window.opener.location && window.opener.location.origin)
        targetOrigin = window.opener.location.origin;
    } catch (e) {}
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ source: "wayward-google-oauth", linked: p }, targetOrigin);
    }
  } catch (e) {}
  window.close();
})();
</script>
<p style="font-family:system-ui;padding:1rem">Gmail account linked. You can close this window.</p>
</body></html>`
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const res = NextResponse.redirect(`${baseUrl()}/?gmail_linked=1`)
  res.cookies.set("wayward_gmail_oauth", encodeURIComponent(JSON.stringify(payload)), {
    maxAge: 120,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  })
  return res
}
