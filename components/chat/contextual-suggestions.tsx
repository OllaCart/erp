"use client"

import type React from "react"
import { useMessages } from "@/context/message-context"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckIcon, XIcon } from "lucide-react"

export const ContextualSuggestions: React.FC = () => {
  const { contextualSuggestions, acceptSuggestion, rejectSuggestion } = useMessages()

  if (contextualSuggestions.length === 0) {
    return null
  }

  return (
    <div className="mb-4 space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Suggested Actions</h3>

      {contextualSuggestions
        .filter((suggestion) => !suggestion.accepted)
        .map((suggestion) => (
          <Card key={suggestion.id} className="border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">{suggestion.title}</CardTitle>
              {suggestion.description && (
                <CardDescription className="text-xs">{suggestion.description}</CardDescription>
              )}
            </CardHeader>
            <CardFooter className="py-2 flex justify-end space-x-2">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => rejectSuggestion(suggestion.id)}>
                <XIcon className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="default" className="h-8" onClick={() => acceptSuggestion(suggestion.id)}>
                <CheckIcon className="h-4 w-4 mr-1" />
                Add
              </Button>
            </CardFooter>
          </Card>
        ))}
    </div>
  )
}
