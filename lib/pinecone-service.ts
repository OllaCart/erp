import { config } from "./config"
import type { Memory } from "@/types/erp"

// This is a simplified mock implementation
// In a real app, you would use the Pinecone SDK
export class PineconeService {
  private apiKey: string
  private environment: string
  private indexName: string

  // In-memory storage for demo purposes
  private vectors: Record<string, { id: string; values: number[]; metadata: any }> = {}

  constructor() {
    this.apiKey = config.pinecone.apiKey
    this.environment = config.pinecone.environment
    this.indexName = config.pinecone.indexName
    if (this.apiKey) {
      console.log("PineconeService initialized (vector store enabled)")
    }
  }

  // Generate a simple vector embedding (mock)
  private generateEmbedding(text: string): number[] {
    // In a real app, you would call OpenAI or another embedding service
    // This is just a simple hash function to generate pseudo-vectors
    const vector: number[] = []
    const seed = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)

    for (let i = 0; i < 10; i++) {
      // Generate 10-dimensional vector for simplicity
      vector.push(Math.sin(seed * (i + 1)) * 0.5 + 0.5)
    }

    return vector
  }

  // Store a memory in Pinecone
  async storeMemory(memory: Memory): Promise<string> {
    const vector = this.generateEmbedding(memory.text)
    const id = memory.id

    this.vectors[id] = {
      id,
      values: vector,
      metadata: {
        userId: memory.userId,
        text: memory.text,
        timestamp: memory.timestamp.toISOString(),
        emotion: memory.emotion,
        tags: memory.tags,
        context: memory.context,
      },
    }

    return id
  }

  // Query similar memories
  async querySimilar(text: string, userId: string, limit = 5): Promise<Memory[]> {
    const queryVector = this.generateEmbedding(text)

    // Calculate cosine similarity between query vector and stored vectors
    const similarities = Object.values(this.vectors)
      .filter((item) => item.metadata.userId === userId)
      .map((item) => {
        const similarity = this.cosineSimilarity(queryVector, item.values)
        return {
          id: item.id,
          similarity,
          metadata: item.metadata,
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    // Convert back to Memory objects
    return similarities.map((item) => ({
      id: item.id,
      userId: item.metadata.userId,
      text: item.metadata.text,
      timestamp: new Date(item.metadata.timestamp),
      emotion: item.metadata.emotion,
      tags: item.metadata.tags || [],
      context: item.metadata.context,
      confidence: item.similarity,
      vector: this.vectors[item.id].values,
    }))
  }

  // Helper function to calculate cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimensions")
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  // Delete a memory
  async deleteMemory(id: string): Promise<boolean> {
    if (this.vectors[id]) {
      delete this.vectors[id]
      return true
    }
    return false
  }
}

// Singleton instance
export const pineconeService = new PineconeService()
