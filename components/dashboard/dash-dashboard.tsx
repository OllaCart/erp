"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LocationService, type LocationData, type LocationPost } from "@/lib/location-service"
import { MapPin, Mic, MicOff, Camera, Video, Upload, RefreshCw, AlertCircle, Volume2, VolumeX } from "lucide-react"

export const DashDashboard: React.FC = () => {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationPosts, setLocationPosts] = useState<LocationPost[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [newPostContent, setNewPostContent] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [orbPulse, setOrbPulse] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const locationService = LocationService.getInstance()

  useEffect(() => {
    void getCurrentLocation({ silent: true })

    // Pulse the orb every 3 seconds
    const pulseInterval = setInterval(() => {
      setOrbPulse(true)
      setTimeout(() => setOrbPulse(false), 1000)
    }, 3000)

    return () => clearInterval(pulseInterval)
  }, [])

  useEffect(() => {
    if (location) {
      loadLocationPosts()
    }
  }, [location])

  const getCurrentLocation = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true
    setIsLoading(true)
    setLocationError(null)

    try {
      const loc = await locationService.getCurrentLocation()
      setLocation(loc)
      if (!silent) speak("Location acquired. Ready to assist.")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown location error"
      setLocationError(errorMessage)
      if (!silent) speak("Unable to access location. Please check permissions.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadLocationPosts = async () => {
    if (!location) return

    try {
      const posts = await locationService.getLocationPosts(location)
      setLocationPosts(posts)
    } catch (error) {
      console.error("Error loading location posts:", error)
    }
  }

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return

      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1.1
      utterance.volume = 0.8

      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      speechSynthesis.speak(utterance)
    },
    [voiceEnabled],
  )

  const onDashVoiceResult = useCallback(
    (transcript: string) => {
      setNewPostContent(transcript)
      speak(`I heard: ${transcript}. Would you like to post this?`)
    },
    [speak],
  )

  const onDashVoiceError = useCallback(() => {
    speak("Sorry, I didn't catch that. Please try again.")
  }, [speak])

  const onDashListeningBegin = useCallback(() => {
    speak("Listening...")
  }, [speak])

  const { start: startVoiceCapture, status: voiceRecStatus, supported: voiceRecSupported } =
    useSpeechRecognition({
      onListeningBegin: onDashListeningBegin,
      onResult: onDashVoiceResult,
      onError: onDashVoiceError,
    })

  const isListening = voiceRecStatus === "listening"

  const startListening = () => {
    if (!voiceRecSupported) {
      speak("Speech recognition not supported in this browser.")
      return
    }
    startVoiceCapture()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))

    setSelectedFiles(validFiles)
    speak(`Selected ${validFiles.length} media files.`)
  }

  const createPost = async () => {
    if (!location || (!newPostContent.trim() && selectedFiles.length === 0)) {
      speak("Please add content or select media files to post.")
      return
    }

    setIsLoading(true)

    try {
      const post = await locationService.createLocationPost(
        "user-123", // In real app, get from auth
        location,
        newPostContent,
        selectedFiles,
      )

      setLocationPosts((prev) => [post, ...prev])
      setNewPostContent("")
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""

      speak("Post created successfully!")
    } catch (error) {
      speak("Error creating post. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDistance = (postLocation: LocationData) => {
    if (!location) return ""
    const distance = locationService.calculateDistance(location, postLocation)
    return distance < 0.1 ? "< 100m" : `${distance.toFixed(1)}km`
  }

  return (
    <div className="h-full flex flex-col space-y-6 overflow-auto p-4">
      {/* Voice Agent Orb */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div
            className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 shadow-lg flex items-center justify-center transition-all duration-1000 ${
              orbPulse ? "scale-110 shadow-xl" : "scale-100"
            } ${isListening ? "animate-pulse" : ""} ${isSpeaking ? "animate-bounce" : ""}`}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {isListening ? (
                <Mic className="w-8 h-8 text-white animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 text-white animate-bounce" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
              )}
            </div>
          </div>

          {/* Status indicators */}
          <div className="absolute -bottom-2 -right-2 flex space-x-1">
            <Button
              size="sm"
              variant={voiceEnabled ? "default" : "outline"}
              className="w-8 h-8 rounded-full p-0"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold">Dash Assistant</h2>
          <p className="text-sm text-muted-foreground">
            {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready to help"}
          </p>
        </div>
      </div>

      {/* Location Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locationError ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          ) : location ? (
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
              <p className="text-sm">
                <strong>Accuracy:</strong> ±{location.accuracy}m
              </p>
              <Badge variant="outline" className="text-xs">
                {new Date(location.timestamp).toLocaleTimeString()}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="text-sm">Getting location...</span>
            </div>
          )}

          <Button
            onClick={() => void getCurrentLocation({ silent: false })}
            disabled={isLoading}
            className="mt-3 w-full bg-transparent"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Location
          </Button>
        </CardContent>
      </Card>

      {/* Create Post */}
      {location && (
        <Card>
          <CardHeader>
            <CardTitle>Share at This Location</CardTitle>
            <CardDescription>Post photos, videos, or thoughts about this place</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={startListening} disabled={isListening || !voiceEnabled} variant="outline" size="sm">
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? "Listening..." : "Voice Input"}
              </Button>

              <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Add Media
              </Button>
            </div>

            <Textarea
              placeholder="What's happening at this location?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="min-h-[80px]"
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected files:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <Badge key={index} variant="secondary">
                      {file.type.startsWith("video/") ? (
                        <Video className="w-3 h-3 mr-1" />
                      ) : (
                        <Camera className="w-3 h-3 mr-1" />
                      )}
                      {file.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={createPost}
              disabled={isLoading || (!newPostContent.trim() && selectedFiles.length === 0)}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isLoading ? "Posting..." : "Share Post"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Location Posts */}
      {location && (
        <Card>
          <CardHeader>
            <CardTitle>Posts Near You</CardTitle>
            <CardDescription>Content shared at this location</CardDescription>
          </CardHeader>
          <CardContent>
            {locationPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No posts found at this location. Be the first to share!
              </p>
            ) : (
              <div className="space-y-4">
                {locationPosts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {formatDistance(post.location)} away
                          </Badge>
                          <span className="text-xs text-muted-foreground">{post.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {post.mediaUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {post.mediaUrls.slice(0, 4).map((url, index) => (
                          <div key={index} className="relative aspect-video bg-muted rounded overflow-hidden">
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`Post media ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {post.mediaType === "video" && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Video className="w-8 h-8 text-white drop-shadow-lg" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
