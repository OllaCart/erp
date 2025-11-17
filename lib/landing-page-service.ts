import type { LandingPage } from "@/types/erp"
import { v4 as uuidv4 } from "uuid"

// In-memory storage for demo purposes
let landingPages: LandingPage[] = []

export const LandingPageService = {
  // Create a new landing page
  createLandingPage: async (
    userId: string,
    type: LandingPage["type"],
    title: string,
    description?: string,
    data?: Record<string, any>,
  ): Promise<LandingPage> => {
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setHours(expiresAt.getHours() + 24) // Expire after 24 hours

    const newPage: LandingPage = {
      id: uuidv4(),
      userId,
      type,
      title,
      description,
      data,
      createdAt: now,
      expiresAt,
      completed: false,
    }

    landingPages.push(newPage)
    return newPage
  },

  // Get a landing page by ID
  getLandingPage: async (id: string): Promise<LandingPage | null> => {
    const page = landingPages.find((p) => p.id === id)
    return page || null
  },

  // Get all landing pages for a user
  getUserLandingPages: async (userId: string): Promise<LandingPage[]> => {
    return landingPages.filter((p) => p.userId === userId)
  },

  // Mark a landing page as completed
  completeLandingPage: async (id: string, data?: Record<string, any>): Promise<LandingPage | null> => {
    const index = landingPages.findIndex((p) => p.id === id)

    if (index === -1) return null

    const updatedPage = {
      ...landingPages[index],
      completed: true,
      data: data || landingPages[index].data,
    }

    landingPages[index] = updatedPage
    return updatedPage
  },

  // Delete expired landing pages
  cleanupExpiredPages: async (): Promise<number> => {
    const now = new Date()
    const initialCount = landingPages.length

    landingPages = landingPages.filter((p) => p.expiresAt > now)

    return initialCount - landingPages.length
  },
}
