import { NextResponse } from "next/server"

export async function GET() {
  const enabled = Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
  return NextResponse.json({ enabled })
}
