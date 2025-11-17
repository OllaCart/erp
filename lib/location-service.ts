export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  address?: string
}

export interface LocationPost {
  id: string
  userId: string
  location: LocationData
  content: string
  mediaUrls: string[]
  mediaType: "photo" | "video" | "mixed"
  timestamp: Date
  tags?: string[]
}

export class LocationService {
  private static instance: LocationService
  private currentLocation: LocationData | null = null
  private watchId: number | null = null

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }
          this.currentLocation = locationData
          resolve(locationData)
        },
        (error) => {
          let errorMessage = "Unknown geolocation error"
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user"
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable"
              break
            case error.TIMEOUT:
              errorMessage = "Location request timed out"
              break
          }
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      )
    })
  }

  startWatchingLocation(callback: (location: LocationData) => void): void {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported")
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }
        this.currentLocation = locationData
        callback(locationData)
      },
      (error) => {
        console.error("Location watch error:", error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      },
    )
  }

  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // In a real app, you'd use a geocoding service like Google Maps API
    // For demo purposes, we'll return a mock address
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }

  calculateDistance(loc1: LocationData, loc2: LocationData): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.latitude - loc1.latitude)
    const dLon = this.toRadians(loc2.longitude - loc1.longitude)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) *
        Math.cos(this.toRadians(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Mock data for demo
  async getLocationPosts(location: LocationData, radiusKm = 0.1): Promise<LocationPost[]> {
    // In a real app, this would query a database
    return [
      {
        id: "1",
        userId: "user-123",
        location: {
          latitude: location.latitude + 0.001,
          longitude: location.longitude + 0.001,
          accuracy: 10,
          timestamp: Date.now() - 3600000,
        },
        content: "Beautiful sunset from this spot!",
        mediaUrls: ["/placeholder.svg?height=200&width=300"],
        mediaType: "photo",
        timestamp: new Date(Date.now() - 3600000),
        tags: ["sunset", "nature"],
      },
      {
        id: "2",
        userId: "user-456",
        location: {
          latitude: location.latitude - 0.0005,
          longitude: location.longitude + 0.0005,
          accuracy: 15,
          timestamp: Date.now() - 7200000,
        },
        content: "Great coffee here!",
        mediaUrls: ["/placeholder.svg?height=200&width=300"],
        mediaType: "photo",
        timestamp: new Date(Date.now() - 7200000),
        tags: ["coffee", "food"],
      },
    ]
  }

  async createLocationPost(
    userId: string,
    location: LocationData,
    content: string,
    mediaFiles: File[],
  ): Promise<LocationPost> {
    // In a real app, this would upload files and save to database
    const mediaUrls = mediaFiles.map((file, index) => `/placeholder.svg?height=200&width=300&query=${file.name}`)

    const mediaType = mediaFiles.some((f) => f.type.startsWith("video/"))
      ? mediaFiles.some((f) => f.type.startsWith("image/"))
        ? "mixed"
        : "video"
      : "photo"

    return {
      id: Date.now().toString(),
      userId,
      location,
      content,
      mediaUrls,
      mediaType,
      timestamp: new Date(),
      tags: [],
    }
  }
}
