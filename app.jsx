"use client"

import { useState, useEffect } from "react"
import AuthPage from "./components/auth/AuthPage"
import Calendar from "./components/calendar/Calendar"
import { supabase } from "./lib/supabase"
import { ROUTES } from "./lib/navigation"

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [currentRoute, setCurrentRoute] = useState(ROUTES.AUTH_SIGNUP)

  useEffect(() => {
    // Check for existing Supabase Auth session on app load
    const initializeAuth = async () => {
      try {
        console.log("🔍 Initializing auth...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        console.log("📋 Session check result:", { session: !!session, error })

        if (error) {
          console.error("Session error:", error)
          setIsLoading(false)
          return
        }

        if (session?.user) {
          console.log("👤 User session found, handling...")
          await handleUserSession(session.user)
        } else {
          console.log("❌ No session found, going to auth")
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        setIsLoading(false)
      }
    }

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn("⏰ Loading timeout reached, stopping loading state")
      setIsLoading(false)
    }, 10000) // 10 seconds timeout

    initializeAuth().finally(() => {
      clearTimeout(loadingTimeout)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      if (event === "SIGNED_IN" && session?.user) {
        await handleUserSession(session.user)
      } else if (event === "SIGNED_OUT") {
        handleSignOut()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleUserSession = async (authUser) => {
    try {
      console.log("Handling user session for:", authUser.id)

      // Try to get existing profile
      let profile = null
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profile")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        // Error other than "not found"
        console.error("Error fetching profile:", fetchError)
        throw fetchError
      }

      if (existingProfile) {
        // Profile exists
        console.log("Profile found:", existingProfile)
        profile = existingProfile
      } else {
        // Profile doesn't exist, create it
        console.log("Profile not found, creating new profile...")

        const username = authUser.user_metadata?.username || authUser.email?.split("@")[0] || "User"

        const profileData = {
          id: authUser.id,
          username: username,
        }

        console.log("Creating profile with data:", profileData)

        const { data: newProfile, error: createError } = await supabase
          .from("profile")
          .insert([profileData])
          .select()
          .single()

        if (createError) {
          console.error("Profile creation error:", createError)

          // If it's a unique constraint error, try to fetch the profile again
          if (createError.code === "23505") {
            console.log("Profile already exists, fetching it...")
            const { data: retryProfile, error: retryError } = await supabase
              .from("profile")
              .select("*")
              .eq("id", authUser.id)
              .single()

            if (retryError) {
              console.error("Error fetching profile after unique constraint error:", retryError)
              throw retryError
            }

            profile = retryProfile
          } else {
            throw createError
          }
        } else {
          console.log("Profile created successfully:", newProfile)
          profile = newProfile
        }
      }

      if (!profile) {
        throw new Error("Could not create or fetch profile")
      }

      // Set user state with profile data
      setUser({
        id: profile.id,
        username: profile.username,
        email: authUser.email,
      })
      setIsAuthenticated(true)
      setCurrentRoute(ROUTES.CALENDAR)
      setIsLoading(false)
    } catch (error) {
      console.error("Error handling user session:", error)
      // Don't sign out the user, just show an error
      setIsLoading(false)
      // You could show an error message here instead of signing out
    }
  }

  const handleSignOut = () => {
    setUser(null)
    setIsAuthenticated(false)
    setCurrentRoute(ROUTES.AUTH_SIGNUP)
    setIsLoading(false)
    localStorage.removeItem("kalindar_user")
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Logout error:", error)
      }
      handleSignOut()
    } catch (error) {
      console.error("Logout exception:", error)
      handleSignOut()
    }
  }

  const navigate = (route) => {
    setCurrentRoute(route)
  }

  // Loading screen component
  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl font-bold mb-4">
          <span className="text-blue-500">k</span>
          <span className="text-red-500">a</span>
          <span className="text-yellow-500">l</span>
          <span className="text-green-500">i</span>
          <span className="text-blue-600">n</span>
          <span className="text-orange-500">d</span>
          <span className="text-red-600">a</span>
          <span className="text-green-600">r</span>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading your calendar...</p>
      </div>
    </div>
  )

  if (isLoading) {
    return <LoadingScreen />
  }

  // Render based on current route and authentication status
  if (isAuthenticated && currentRoute === ROUTES.CALENDAR) {
    return <Calendar user={user} onLogout={handleLogout} />
  }

  // Show auth page for non-authenticated users or auth routes
  return <AuthPage currentRoute={currentRoute} navigate={navigate} />
}
