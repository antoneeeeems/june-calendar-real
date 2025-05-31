"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Mail } from "lucide-react"
import { supabase } from "../../lib/supabase"

export default function SignupForm({ onSignupSuccess, onSwitchToLogin }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
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

    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formData.username.trim().length < 2) {
      newErrors.username = "Username must be at least 2 characters"
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

      // Create user with Supabase Auth and store username in metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            username: formData.username.trim(),
          },
        },
      })

      console.log("Signup response:", { authData, authError })
      setDebugInfo({ step: "auth_signup", authData, authError })

      if (authError) {
        console.error("Signup error:", authError)

        // Handle specific error types
        if (authError.message.includes("already registered")) {
          setErrors({ email: "An account with this email already exists. Please try logging in instead." })
        } else if (authError.message.includes("Invalid email")) {
          setErrors({ email: "Please enter a valid email address" })
        } else if (authError.message.includes("Password")) {
          setErrors({ password: authError.message })
        } else if (authError.message.includes("rate limit")) {
          setErrors({ email: "Too many signup attempts. Please wait a moment and try again." })
        } else {
          setErrors({ email: `Signup failed: ${authError.message}` })
        }
        setIsLoading(false)
        return
      }

      // Check if user was created successfully
      if (authData?.user) {
        console.log("User created successfully:", authData.user.id)
        console.log("Username stored in metadata:", authData.user.user_metadata?.username)
        console.log("Email confirmation required:", !authData.user.email_confirmed_at)

        setIsLoading(false)

        // Show email verification screen
        setShowEmailVerification(true)
      } else {
        console.error("No user data returned from signup")
        setErrors({ email: "Account creation failed. Please try again." })
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Signup exception:", error)
      setDebugInfo((prev) => ({ ...prev, exception: error.message }))

      if (error.message.includes("fetch")) {
        setErrors({ email: "Network connection failed. Please check your internet connection and try again." })
      } else {
        setErrors({ email: `Error: ${error.message}` })
      }
      setIsLoading(false)
    }
  }

  const handleContinueToLogin = () => {
    setShowEmailVerification(false)
    // Clear form
    setFormData({
      username: "",
      email: "",
      password: "",
    })
    setDebugInfo(null)
    // Redirect to login page
    onSignupSuccess()
  }

  const EmailVerificationScreen = () => (
    <div className="text-center font-sans">
      <div className="mb-6">
        <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
        <p className="text-gray-600 mb-4">
          We've sent a verification link to <strong>{formData.email}</strong>
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Please check your email and click the verification link to activate your account. After verifying, you can
          return here and log in.
        </p>
      </div>

      <div className="space-y-4">
        <Button onClick={handleContinueToLogin} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
          Continue to Login
        </Button>

        <p className="text-center text-gray-600">
          Didn't receive the email?{" "}
          <button
            onClick={() => setShowEmailVerification(false)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Try signing up again
          </button>
        </p>
      </div>
    </div>
  )

  if (showEmailVerification) {
    return <EmailVerificationScreen />
  }

  return (
    <div className="transition-all duration-300 font-sans">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">Create an Account</h1>
      <p className="text-gray-600 mb-8 md:mb-10">
        Today is a new day. It's your day. You shape it.
        <br />
        Sign up to start managing your projects.
      </p>

      <form onSubmit={handleSignUp} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <Input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Username"
            className={`w-full h-12 ${errors.username ? "border-red-500" : ""}`}
            disabled={isLoading}
          />
          {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Example@email.com"
            className={`w-full h-12 ${errors.email ? "border-red-500" : ""}`}
            disabled={isLoading}
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
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
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
              Creating account...
            </div>
          ) : (
            "Sign up"
          )}
        </Button>
      </form>

      {debugInfo && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
          <p className="font-bold mb-2">Debug Info:</p>
          <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      <p className="text-center text-gray-600 mt-8">
        Already have an account?{" "}
        <button onClick={onSwitchToLogin} className="text-blue-600 hover:text-blue-700 font-medium">
          Log in
        </button>
      </p>
    </div>
  )
}
