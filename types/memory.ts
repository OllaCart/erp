export type EmotionalState = "neutral" | "positive" | "negative" | "excited" | "anxious"

export interface MemoryEvent {
  id: string
  userId: string
  text: string
  emotion: EmotionalState
  timestamp: Date
  location?: string
  context?: string
  confidence: number
  tags: string[]
}

export interface MemoryQuery {
  text: string
  emotion?: EmotionalState
  context?: string
  limit?: number
}

export interface MemoryFeedback {
  memoryId: string
  isAccurate: boolean
  correction?: string
  emotionUpdate?: EmotionalState
}
