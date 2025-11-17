import { NextResponse } from "next/server"
import neo4j from "neo4j-driver"

// Neo4j connection
let driver: neo4j.Driver | null = null

try {
  // Only create the driver if we have valid credentials
  if (process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD) {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
    )
    console.log("Neo4j driver initialized")
  } else {
    console.warn("Neo4j credentials missing, running in mock mode")
  }
} catch (error) {
  console.error("Failed to initialize Neo4j driver:", error)
  driver = null
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    let operation, params
    try {
      const body = await request.json()
      operation = body.operation
      params = body.params
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json({
        success: false,
        error: "Invalid request format",
        mock: true,
        result: getMockResult("unknown", {}),
      })
    }

    // If driver is null, return mock data
    if (!driver) {
      return NextResponse.json({
        success: true,
        result: getMockResult(operation, params),
        mock: true,
      })
    }

    // Create a session
    const session = driver.session()

    try {
      let result

      switch (operation) {
        case "ensureUserExists":
          result = await session.run(
            `
            MERGE (u:User {id: $userId})
            ON CREATE SET u.name = $name, u.createdAt = datetime()
            RETURN u
            `,
            { userId: params.userId, name: params.name || "User" },
          )
          break

        case "createMemory":
          result = await session.run(
            `
            MATCH (u:User {id: $userId})
            CREATE (m:Memory {
              id: $memoryId,
              text: $text,
              emotion: $emotion,
              context: $context,
              confidence: $confidence,
              tags: $tags,
              timestamp: datetime(),
              createdAt: datetime()
            })
            CREATE (u)-[:HAS_MEMORY]->(m)
            RETURN m
            `,
            params,
          )
          break

        case "createContext":
          result = await session.run(
            `
            MATCH (u:User {id: $userId})
            CREATE (c:Context {
              id: $contextId,
              name: $name,
              description: $description,
              type: $type,
              createdAt: datetime()
            })
            CREATE (u)-[:HAS_CONTEXT]->(c)
            RETURN c
            `,
            params,
          )

          // Link related entities if provided
          if (params.relatedEntityIds && params.relatedEntityIds.length > 0) {
            for (const entityId of params.relatedEntityIds) {
              await session.run(
                `
                MATCH (c:Context {id: $contextId})
                MATCH (e {id: $entityId})
                CREATE (c)-[:INCLUDES]->(e)
                `,
                { contextId: params.contextId, entityId },
              )
            }
          }
          break

        case "getUserContexts":
          result = await session.run(
            `
            MATCH (u:User {id: $userId})-[:HAS_CONTEXT]->(c:Context)
            RETURN c
            `,
            { userId: params.userId },
          )
          break

        case "getContextWithRelatedEntities":
          const contextResult = await session.run(
            `
            MATCH (c:Context {id: $contextId})
            RETURN c
            `,
            { contextId: params.contextId },
          )

          const entitiesResult = await session.run(
            `
            MATCH (c:Context {id: $contextId})-[:INCLUDES]->(e)
            RETURN e, labels(e) as types
            `,
            { contextId: params.contextId },
          )

          result = {
            context: contextResult.records.length > 0 ? contextResult.records[0] : null,
            entities: entitiesResult.records,
          }
          break

        // Add more operations as needed

        default:
          return NextResponse.json(
            {
              success: false,
              error: "Unknown operation",
              mock: true,
              result: getMockResult("unknown", {}),
            },
            { status: 200 },
          )
      }

      return NextResponse.json({ success: true, result })
    } catch (error) {
      console.error("Neo4j session error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database operation failed",
          message: error instanceof Error ? error.message : String(error),
          mock: true,
          result: getMockResult(operation, params),
        },
        { status: 200 },
      )
    } finally {
      await session.close()
    }
  } catch (error) {
    console.error("Neo4j API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
        mock: true,
        result: getMockResult("unknown", {}),
      },
      { status: 200 },
    )
  }
}

// Function to generate mock data for different operations
function getMockResult(operation: string, params: any) {
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
