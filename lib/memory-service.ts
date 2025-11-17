import type { Memory, EmotionalState } from "@/types/erp"
import { pineconeService } from "./pinecone-service"
import { v4 as uuidv4 } from "uuid"

// In-memory storage for demo purposes (metadata only)
const memories: Memory[] = []

export const MemoryService = {
  // Store a new memory
  storeMemory: async (memory: Omit<Memory, "id" | "confidence" | "vector">): Promise<Memory> => {
    const newMemory: Memory = {
      id: uuidv4(),
      confidence: 0.85, // Default confidence
      ...memory,
      timestamp: new Date(memory.timestamp),
      tags: memory.tags || [],
    }

    // Store in Pinecone
    await pineconeService.storeMemory(newMemory)

    // Store metadata in local memory
    memories.push(newMemory)

    return newMemory
  },

  // Retrieve memories based on semantic search
  retrieveMemories: async (userId: string, query: string, limit = 5): Promise<Memory[]> => {
    // Query Pinecone for similar memories
    return await pineconeService.querySimilar(query, userId, limit)
  },

  // Update memory based on feedback
  refineMemory: async (
    memoryId: string,
    updates: { text?: string; emotion?: EmotionalState; confidence?: number },
  ): Promise<Memory | null> => {
    const index = memories.findIndex((m) => m.id === memoryId)

    if (index === -1) return null

    const updatedMemory = { ...memories[index], ...updates }

    // Update in Pinecone
    await pineconeService.deleteMemory(memoryId)
    await pineconeService.storeMemory(updatedMemory)

    // Update local memory
    memories[index] = updatedMemory

    return updatedMemory
  },

  // Get all memories for a user
  getUserMemories: async (userId: string): Promise<Memory[]> => {
    return memories.filter((m) => m.userId === userId)
  },

  // Get memories by tags
  getMemoriesByTags: async (userId: string, tags: string[]): Promise<Memory[]> => {
    return memories.filter((m) => m.userId === userId && tags.some((tag) => m.tags.includes(tag)))
  },
}
