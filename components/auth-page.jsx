"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, CheckCircle } from "lucide-react"
import { supabase } from "../lib/supabase"

export default function AuthPage({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (isSignUp && !formData.username.trim()) {
      newErrors.username = "Username is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignUp = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})
    setDebugInfo(null)

    try {
      console.log("Starting signup process...")
      console.log("Email:", formData.email.trim())
      console.log("Username:", formData.username.trim())

      // Step 1: Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
      })

      console.log("Signup response:", { data, error })
      setDebugInfo({ data, error, step: "auth_signup" })

      if (error) {
        console.error("Signup error:", error)

        // Handle specific error types
        if (error.message.includes("Database error")) {
          setErrors({
            email: "Account creation temporarily unavailable. Please try again later.",
          })
        } else if (error.message.includes("already registered")) {
          setErrors({ email: "An account with this email already exists" })
        } else if (error.message.includes("Invalid email")) {
          setErrors({ email: "Please enter a valid email address" })
        } else if (error.message.includes("Password")) {
          setErrors({ password: error.message })
        } else {
          setErrors({ email: `Signup failed: ${error.message}` })
        }
        setIsLoading(false)
        return
      }

      // Step 2: Check if user was created successfully
      if (data?.user) {
        console.log("User created successfully:", data.user.id)

        // Step 3: Create profile entry
        try {
          console.log("Creating profile...")
          const { error: profileError } = await supabase.from("profile").insert([
            {
              id: data.user.id,
              username: formData.username.trim(),
              created_at: new Date().toISOString(),
            },
          ])

          if (profileError) {
            console.warn("Profile creation error:", profileError)
            setDebugInfo((prev) => ({ ...prev, profileError, step: "profile_creation" }))
          } else {
            console.log("Profile created successfully")
          }
        } catch (profileErr) {
          console.warn("Profile creation exception:", profileErr)
        }

        // Step 4: Since no email confirmation is needed, automatically log the user in
        console.log("Account created successfully, logging user in...")

        setIsLoading(false)
        setShowSuccessPopup(true)

        setTimeout(() => {
          setShowSuccessPopup(false)
          onLogin({
            id: data.user.id,
            username: formData.username.trim(),
            email: data.user.email,
          })
        }, 2000)
      } else {
        console.error("No user data returned from signup")
        setErrors({ email: "Account creation failed. Please try again." })
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Signup exception:", error)
      setDebugInfo({ error: error.message, step: "exception" })

      if (error.message.includes("fetch")) {
        setErrors({ email: "Network connection failed. Please check your internet connection and try again." })
      } else {
        setErrors({ email: `Error: ${error.message}` })
      }
      setIsLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})
    setDebugInfo(null)

    try {
      console.log("Starting login process...")

      // Step 1: Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })

      console.log("Login response:", { data, error })
      setDebugInfo({ data, error, step: "auth_login" })

      if (error) {
        console.error("Login error:", error)

        if (error.message.includes("Invalid login credentials")) {
          setErrors({ email: "Invalid email or password" })
        } else {
          setErrors({ email: `Login failed: ${error.message}` })
        }
        setIsLoading(false)
        return
      }

      // Step 2: Only if login was successful, get or create profile
      if (data?.user) {
        console.log("Login successful, fetching profile...")

        try {
          let profile = null

          // Try to get existing profile
          const { data: profileData, error: profileError } = await supabase
            .from("profile")
            .select("*")
            .eq("id", data.user.id)
            .single()

          if (profileError && profileError.code === "PGRST116") {
            // Profile doesn't exist, create it
            console.log("Profile not found, creating new one...")
            const { data: newProfile, error: createError } = await supabase
              .from("profile")
              .insert([
                {
                  id: data.user.id,
                  username: data.user.email?.split("@")[0] || "User",
                  created_at: new Date().toISOString(),
                },
              ])
              .select()
              .single()

            if (createError) {
              console.error("Profile creation error:", createError)
              setErrors({ email: "Failed to create user profile" })
              setIsLoading(false)
              return
            }

            profile = newProfile
          } else if (profileError) {
            console.error("Profile fetch error:", profileError)
            setErrors({ email: "Failed to load user profile" })
            setIsLoading(false)
            return
          } else {
            profile = profileData
          }

          setIsLoading(false)
          setShowSuccessPopup(true)

          setTimeout(() => {
            setShowSuccessPopup(false)
            onLogin({
              id: profile.id,
              username: profile.username,
              email: data.user.email,
            })
          }, 2000)
        } catch (profileErr) {
          console.error("Profile handling error:", profileErr)
          setErrors({ email: "Failed to load user profile" })
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error("Login exception:", error)
      setErrors({ email: `Error: ${error.message}` })
      setIsLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isSignUp) {
      handleSignUp(e)
    } else {
      handleLogin(e)
    }
  }

  const toggleMode = () => {
    setIsTransitioning(true)
    setErrors({})
    setFormData({
      username: "",
      email: "",
      password: "",
    })
    setDebugInfo(null)

    setTimeout(() => {
      setIsSignUp(!isSignUp)
      setIsTransitioning(false)
    }, 150)
  }

  const KalendarLogo = () => (
    <div className="text-4xl md:text-5xl font-bold mb-6 md:mb-8">
      <span className="text-blue-500">k</span>
      <span className="text-red-500">a</span>
      <span className="text-yellow-500">l</span>
      <span className="text-green-500">i</span>
      <span className="text-blue-600">n</span>
      <span className="text-orange-500">d</span>
      <span className="text-red-600">a</span>
      <span className="text-green-600">r</span>
    </div>
  )

  const SuccessPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in duration-300">
        <div className="mb-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{isSignUp ? "Account Created!" : "Login Successful!"}</h2>
        <p className="text-gray-600 mb-4">{isSignUp ? "Welcome to Kalindar!" : "Welcome back to Kalindar"}</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex">
      {showSuccessPopup && <SuccessPopup />}

      {/* Mobile Layout */}
      <div className="md:hidden w-full flex flex-col">
        <div
          className="h-64 bg-cover bg-center rounded-b-3xl"
          style={{
            backgroundImage: `url('/floral-background.png')`,
          }}
        />

        <div className="flex-1 px-6 py-8 bg-white">
          <KalendarLogo />

          <div
            className={`transition-all duration-300 ${isTransitioning ? "opacity-0 transform translate-y-4" : "opacity-100 transform translate-y-0"}`}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{isSignUp ? "Create an Account" : "Welcome"}</h1>
            <p className="text-gray-600 mb-8">
              Today is a new day. It's your day. You shape it.
              <br />
              Sign in to start managing your projects.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <Input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Username"
                    className={`w-full ${errors.username ? "border-red-500" : ""}`}
                  />
                  {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Example@email.com"
                  className={`w-full ${errors.email ? "border-red-500" : ""}`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="At least 6 characters"
                    className={`w-full pr-10 ${errors.password ? "border-red-500" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isSignUp ? "Creating account..." : "Logging in..."}
                  </div>
                ) : isSignUp ? (
                  "Sign Up"
                ) : (
                  "Log in"
                )}
              </Button>
            </form>

            {debugInfo && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                <p className="font-bold">Debug Info:</p>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}

            <p className="text-center text-gray-600 mt-6">
              {isSignUp ? "Already have an account? " : "Don't you have an account? "}
              <button onClick={toggleMode} className="text-blue-600 hover:text-blue-700 font-medium">
                {isSignUp ? "Log In" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        <div className={`flex-1 flex items-center justify-center p-12 bg-white ${isSignUp ? "order-2" : "order-1"}`}>
          <div className="w-full max-w-md">
            <KalendarLogo />

            <div
              className={`transition-all duration-300 ${isTransitioning ? "opacity-0 transform translate-y-4" : "opacity-100 transform translate-y-0"}`}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{isSignUp ? "Create an Account" : "Welcome"}</h1>
              <p className="text-gray-600 mb-10">
                Today is a new day. It's your day. You shape it.
                <br />
                Sign in to start managing your projects.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <Input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Username"
                      className={`w-full h-12 ${errors.username ? "border-red-500" : ""}`}
                    />
                    {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Example@email.com"
                    className={`w-full h-12 ${errors.email ? "border-red-500" : ""}`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="At least 6 characters"
                      className={`w-full h-12 pr-10 ${errors.password ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-lg font-medium text-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {isSignUp ? "Creating account..." : "Logging in..."}
                    </div>
                  ) : isSignUp ? (
                    "Sign up"
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>

              {debugInfo && (
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  <p className="font-bold">Debug Info:</p>
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}

              <p className="text-center text-gray-600 mt-8">
                {isSignUp ? "Already have an account? " : "Don't you have an account? "}
                <button onClick={toggleMode} className="text-blue-600 hover:text-blue-700 font-medium">
                  {isSignUp ? "Log in" : "Sign up"}
                </button>
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex-1 bg-cover bg-center ${isSignUp ? "order-1" : "order-2"}`}
          style={{
            backgroundImage: `url('/floral-background.png')`,
          }}
        />
      </div>
    </div>
  )
}
