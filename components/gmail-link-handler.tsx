"use client"

import { useEffect } from "react"
import {
  GMAIL_OAUTH_MESSAGE_SOURCE,
  ingestGoogleOAuthPayload,
} from "@/lib/gmail-account-linking"
import { toast } from "@/components/ui/use-toast"

export function GmailLinkHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const sp = new URLSearchParams(window.location.search)
    const gmailLinked = sp.get("gmail_linked") === "1"
    const oauthErr = sp.get("gmail_oauth_error")
    if (gmailLinked || oauthErr) {
      sessionStorage.setItem("wayward-settings-tab", "accounts")
      window.dispatchEvent(new CustomEvent("wayward-navigate", { detail: { tab: "settings" } }))
      window.dispatchEvent(new CustomEvent("wayward-open-linked-accounts"))
      if (oauthErr) {
        toast({
          title: "Could not link Gmail",
          description: decodeURIComponent(oauthErr),
          variant: "destructive",
        })
      }
      window.history.replaceState({}, "", window.location.pathname || "/")
    }

    function consumeCookie() {
      const match = document.cookie.match(/(?:^|; )wayward_gmail_oauth=([^;]*)/)
      if (!match?.[1]) return
      document.cookie = "wayward_gmail_oauth=; path=/; max-age=0"
      try {
        const raw = decodeURIComponent(match[1].trim())
        const data = JSON.parse(raw) as Parameters<typeof ingestGoogleOAuthPayload>[0]
        const r = ingestGoogleOAuthPayload(data)
        if (r.ok) {
          window.dispatchEvent(new CustomEvent("wayward-open-linked-accounts"))
          if (r.duplicate) {
            toast({
              title: "Already linked",
              description: `${r.account.email} is already connected.`,
            })
          } else {
            toast({
              title: "Gmail linked",
              description: `Connected ${r.account.email}`,
            })
          }
        }
      } catch {
        toast({
          title: "Gmail link failed",
          description: "Could not read account data from the browser.",
          variant: "destructive",
        })
      }
    }

    consumeCookie()

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      const d = e.data as { source?: string; linked?: Parameters<typeof ingestGoogleOAuthPayload>[0] }
      if (!d || d.source !== GMAIL_OAUTH_MESSAGE_SOURCE || !d.linked) return
      const r = ingestGoogleOAuthPayload(d.linked)
      if (r.ok) {
        window.dispatchEvent(new CustomEvent("wayward-open-linked-accounts"))
        if (r.duplicate) {
          toast({
            title: "Already linked",
            description: `${r.account.email} is already connected.`,
          })
        } else {
          toast({
            title: "Gmail linked",
            description: `Connected ${r.account.email}`,
          })
        }
      }
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return null
}
