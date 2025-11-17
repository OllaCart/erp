// This is a client-side service that communicates with the Neo4j API route

class Neo4jService {
  private async callNeo4jApi(operation: string, params: any) {
    try {
      const response = await fetch("/api/neo4j", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation, params }),
      })

      // First check if the response is ok
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`)
        // Return mock data if the API call fails
        return {
          success: true,
          mock: true,
          result: this.getMockResult(operation, params),
        }
      }

      // Try to parse the response as JSON, but handle parsing errors
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError)
        // Return mock data if JSON parsing fails
        return {
          success: true,
          mock: true,
          result: this.getMockResult(operation, params),
        }
      }

      return data
    } catch (error) {
      console.error("Error calling Neo4j API:", error)
      // Return a mock response to allow the app to continue functioning
      return {
        success: true,
        mock: true,
        result: this.getMockResult(operation, params),
      }
    }
  }

  // Helper method to generate mock results for different operations
  private getMockResult(operation: string, params: any) {
    switch (operation) {
      case "ensureUserExists":
        return {
          records: [
            {
              get: () => ({
                properties: {
                  id: params.userId,
                  name: params.name || "User",
                  createdAt: new Date().toISOString(),
                },
              }),
            },
          ],
        }

      case "createMemory":
        return {
          records: [
            {
              get: () => ({
                properties: {
                  id: params.memoryId,
                  text: params.text,
                  emotion: params.emotion,
                  context: params.context,
                  confidence: params.confidence,
                  tags: params.tags,
                  timestamp: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                },
              }),
            },
          ],
        }

      case "createContext":
        return {
          records: [
            {
              get: () => ({
                properties: {
                  id: params.contextId,
                  name: params.name,
                  description: params.description,
                  type: params.type,
                  createdAt: new Date().toISOString(),
                },
              }),
            },
          ],
        }

      case "getUserContexts":
        return {
          records: [
            {
              get: () => ({
                properties: {
                  id: "1",
                  name: "Trip to Montenegro",
                  description: "Summer vacation planning",
                  type: "travel",
                  createdAt: new Date().toISOString(),
                },
              }),
            },
            {
              get: () => ({
                properties: {
                  id: "2",
                  name: "Monthly Budget",
                  description: "June 2023 budget planning",
                  type: "finance",
                  createdAt: new Date().toISOString(),
                },
              }),
            },
          ],
        }

      case "getContextWithRelatedEntities":
        return {
          context: {
            get: () => ({
              properties: {
                id: params.contextId,
                name: "Trip to Montenegro",
                description: "Summer vacation planning",
                type: "travel",
                createdAt: new Date().toISOString(),
              },
            }),
          },
          entities: [
            {
              get: (key: string) => {
                if (key === "e") {
                  return {
                    properties: {
                      id: "e1",
                      title: "Travel Budget",
                      description: "Budget for Montenegro trip",
                      amount: 4000,
                      category: "Travel",
                      date: new Date().toISOString(),
                    },
                  }
                } else if (key === "types") {
                  return ["Transaction"]
                }
              },
            },
            {
              get: (key: string) => {
                if (key === "e") {
                  return {
                    properties: {
                      id: "e2",
                      title: "Book accommodation",
                      description: "Find and book suitable accommodation",
                      status: "pending",
                      priority: 4,
                    },
                  }
                } else if (key === "types") {
                  return ["Task"]
                }
              },
            },
          ],
        }

      default:
        return { records: [] }
    }
  }

  async ensureUserExists(userId: string, name = "User") {
    return this.callNeo4jApi("ensureUserExists", { userId, name })
  }

  async createMemory(
    userId: string,
    memoryId: string,
    text: string,
    emotion: string | null,
    context: string | null,
    confidence: number,
    tags: string[],
  ) {
    return this.callNeo4jApi("createMemory", {
      userId,
      memoryId,
      text,
      emotion,
      context,
      confidence,
      tags,
    })
  }

  async createContext(
    userId: string,
    contextId: string,
    name: string,
    description: string,
    type: string,
    relatedEntityIds: string[] = [],
  ) {
    return this.callNeo4jApi("createContext", {
      userId,
      contextId,
      name,
      description,
      type,
      relatedEntityIds,
    })
  }

  async getUserContexts(userId: string) {
    const response = await this.callNeo4jApi("getUserContexts", { userId })
    return response.result.records || []
  }

  async getContextWithRelatedEntities(contextId: string) {
    const response = await this.callNeo4jApi("getContextWithRelatedEntities", { contextId })
    return {
      context: response.result.context || null,
      entities: response.result.entities || [],
    }
  }

  // Mock implementations for other methods
  async createFinancialTransaction(
    userId: string,
    transactionId: string,
    amount: number,
    type: string,
    category: string,
    description: string,
    date: Date,
  ) {
    console.log("Mock createFinancialTransaction called", {
      userId,
      transactionId,
      amount,
      type,
      category,
      description,
      date,
    })
    return { success: true }
  }

  async createTask(
    userId: string,
    taskId: string,
    title: string,
    description: string | null,
    status: string,
    priority: number,
    dueDate: Date | null,
  ) {
    console.log("Mock createTask called", {
      userId,
      taskId,
      title,
      description,
      status,
      priority,
      dueDate,
    })
    return { success: true }
  }

  async createCalendarEvent(
    userId: string,
    eventId: string,
    title: string,
    description: string | null,
    type: string,
    startDate: Date,
    endDate: Date | null,
    location: string | null,
  ) {
    console.log("Mock createCalendarEvent called", {
      userId,
      eventId,
      title,
      description,
      type,
      startDate,
      endDate,
      location,
    })
    return { success: true }
  }

  async createRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    properties: Record<string, any> = {},
  ) {
    console.log("Mock createRelationship called", {
      sourceId,
      targetId,
      relationshipType,
      properties,
    })
    return { success: true }
  }

  async getRelatedEntities(entityId: string) {
    console.log("Mock getRelatedEntities called", { entityId })
    return []
  }

  async getTasksByContext(userId: string, context: string) {
    console.log("Mock getTasksByContext called", { userId, context })
    return []
  }

  async getTransactionsByContext(userId: string, context: string) {
    console.log("Mock getTransactionsByContext called", { userId, context })
    return []
  }

  async getEventsByContext(userId: string, context: string) {
    console.log("Mock getEventsByContext called", { userId, context })
    return []
  }
}

// Singleton instance
export const neo4jService = new Neo4jService()
