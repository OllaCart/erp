"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MemoryService } from "@/lib/memory-service"
import type { EmotionalState } from "@/types/memory"
import { toast } from "@/components/ui/use-toast"

export default function MemoryForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    text: "",
    emotion: "neutral" as EmotionalState,
    location: "",
    context: "",
    tags: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEmotionChange = (value: string) => {
    setFormData((prev) => ({ ...prev, emotion: value as EmotionalState }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await MemoryService.storeMemory({
        userId: "user-123", // In a real app, get from auth
        text: formData.text,
        emotion: formData.emotion,
        timestamp: new Date(),
        location: formData.location || undefined,
        context: formData.context || undefined,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      })

      toast({
        title: "Memory Stored",
        description: "Your memory has been successfully stored.",
      })

      router.push("/")
    } catch (error) {
      console.error("Error storing memory:", error)
      toast({
        title: "Error",
        description: "Failed to store memory. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Detailed Memory</CardTitle>
          <CardDescription>Create a new memory with additional context and metadata</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Memory Content</Label>
              <Textarea
                id="text"
                name="text"
                placeholder="Describe your memory in detail..."
                value={formData.text}
                onChange={handleChange}
                required
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emotion">Emotional State</Label>
              <Select value={formData.emotion} onValueChange={handleEmotionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select emotion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="anxious">Anxious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                name="location"
                placeholder="Where did this happen?"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context (Optional)</Label>
              <Input
                id="context"
                name="context"
                placeholder="What was the context of this memory?"
                value={formData.context}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="Comma-separated tags"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Memory"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
