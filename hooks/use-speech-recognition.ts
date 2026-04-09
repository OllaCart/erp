"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type SpeechListenStatus = "idle" | "listening" | "error"

export interface UseSpeechRecognitionOptions {
  lang?: string
  onResult: (transcript: string) => void
  onError?: (message: string) => void
  /** Fired when the mic session actually starts (after start()). */
  onListeningBegin?: () => void
}

/**
 * One-shot browser speech-to-text (Web Speech API).
 * Creates a fresh Recognition instance per start() call, matching Dash dashboard behavior.
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions) {
  const { lang = "en-US", onResult, onError, onListeningBegin } = options
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [status, setStatus] = useState<SpeechListenStatus>("idle")

  const abort = useCallback(() => {
    try {
      recognitionRef.current?.abort()
    } catch {
      /* noop */
    }
    recognitionRef.current = null
    setStatus("idle")
  }, [])

  const start = useCallback(() => {
    if (typeof window === "undefined") return
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      onError?.("Speech recognition is not supported in this browser.")
      setStatus("error")
      return
    }

    abort()

    const Ctor = window.webkitSpeechRecognition || window.SpeechRecognition
    const recognition = new Ctor()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = lang

    recognition.onstart = () => {
      setStatus("listening")
      onListeningBegin?.()
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ""
      if (transcript) onResult(transcript)
    }

    recognition.onerror = () => {
      setStatus("error")
      onError?.("Could not capture speech. Try again.")
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setStatus("idle")
    }

    try {
      recognition.start()
    } catch {
      setStatus("error")
      onError?.("Could not start microphone.")
    }
  }, [abort, lang, onError, onListeningBegin, onResult])

  useEffect(() => () => abort(), [abort])

  const supported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)

  return { start, abort, status, supported }
}
