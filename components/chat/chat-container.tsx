"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { ContextualSuggestions } from "./contextual-suggestions"
import { FollowUpQuestions } from "./follow-up-questions"
import { useMessages } from "@/context/message-context"
import { Button } from "@/components/ui/button"
import { Loader2Icon, TrashIcon } from "lucide-react"

export const ChatContainer: React.FC = () => {
  const { messages, isLoading, clearMessages } = useMessages()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Contextual ERP Assistant</h2>
        <Button variant="ghost" size="icon" onClick={clearMessages}>
          <TrashIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-center my-4">
            <Loader2Icon className="h-6 w-6 animate-spin" />
          </div>
        )}

        <ContextualSuggestions />
        <FollowUpQuestions />

        <div ref={messagesEndRef} />
      </div>

      <ChatInput />
    </div>
  )
}
