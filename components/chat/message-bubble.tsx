"use client"

import React from "react"
import type { Message } from "@/types/erp"
import { Button } from "@/components/ui/button"
import { ExternalLinkIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface MessageBubbleProps {
  message: Message
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  // Format message text with line breaks
  const formattedText = message.text.split("\n").map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < message.text.split("\n").length - 1 && <br />}
    </React.Fragment>
  ))

  return (
    <div className={cn("flex w-full mb-4", message.sender === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg p-3",
          message.sender === "user"
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-muted text-muted-foreground rounded-tl-none",
        )}
      >
        <div className="text-sm">{formattedText}</div>

        {message.requiresLandingPage && message.landingPageUrl && (
          <div className="mt-2">
            <Link href={message.landingPageUrl} passHref>
              <Button size="sm" variant="outline" className="flex items-center">
                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                Open Form
              </Button>
            </Link>
          </div>
        )}

        <div className="text-xs mt-1 opacity-70">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  )
}
