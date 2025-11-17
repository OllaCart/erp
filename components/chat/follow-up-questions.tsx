"use client"

import type React from "react"
import { useState } from "react"
import { useMessages } from "@/context/message-context"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendIcon } from "lucide-react"

export const FollowUpQuestions: React.FC = () => {
  const { followUpQuestions, answerFollowUpQuestion } = useMessages()
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState("")

  if (followUpQuestions.length === 0) {
    return null
  }

  const handleSubmitAnswer = (question: string) => {
    if (!answer.trim()) return

    answerFollowUpQuestion(question, answer)
    setActiveQuestion(null)
    setAnswer("")
  }

  return (
    <div className="mb-4 space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Follow-up Questions</h3>

      {followUpQuestions.map((question) => (
        <Card key={question} className="border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{question}</CardTitle>
          </CardHeader>
          <CardFooter className="py-2">
            {activeQuestion === question ? (
              <div className="flex w-full space-x-2">
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1"
                />
                <Button size="sm" onClick={() => handleSubmitAnswer(question)} disabled={!answer.trim()}>
                  <SendIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setActiveQuestion(question)}>
                Answer
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
