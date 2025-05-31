"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, CheckCircle, Mail, RefreshCw, AlertCircle } from "lucide-react"
import { supabase } from "../../lib/supabase"

export default function LoginForm({ onSwitchToSignup }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showEmailNotVerified, setShowEmailNotVerified] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
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

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: formData.email.trim(),
      })

      if (error) {
        console.error("Resend verification error:", error)
        setErrors({ email: `Failed to resend verification: ${error.message}` })
      } else {
        setErrors({})
        alert("Verification email sent! Please check your inbox.")
      }
    } catch (error) {
      console.error("Resend verification exception:", error)
      setErrors({ email: "Failed to resend verification email" })
    } finally {
      setIsResending(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})
    setDebugInfo(null)
    setShowEmailNotVerified(false)

    try {
      console.log("Starting login process...")
      console.log("Email:", formData.email.trim())

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })

      console.log("Login response:", { data, error })
      setDebugInfo({ step: "auth_login", data, error })

      if (error) {
        console.error("Login error:", error)

        // Handle specific error types
        if (error.message.includes("Invalid login credentials")) {
          setErrors({
            email: "Invalid email or password. Make sure you've verified your email address.",
          })
        } else if (error.message.includes("Email not confirmed")) {
          setErrors({
            email: "Please verify your email address before logging in.",
          })
          setShowEmailNotVerified(true)
        } else if (error.message.includes("Too many requests")) {
          setErrors({ email: "Too many login attempts. Please wait a moment and try again." })
        } else if (error.message.includes("User not found")) {
          setErrors({ email: "No account found with this email. Please sign up first." })
        } else {
          setErrors({ email: `Login failed: ${error.message}` })
        }
        setIsLoading(false)
        return
      }

      // Check if login was successful
      if (data?.user) {
        console.log("Login successful for user:", data.user.id)
        console.log("User email confirmed:", data.user.email_confirmed_at)
        console.log("User metadata:", data.user.user_metadata)

        setIsLoading(false)
        setShowSuccessPopup(true)

        setTimeout(() => {
          setShowSuccessPopup(false)
          // Navigation will be handled by the auth state change in App.jsx
        }, 1500)
      } else {
        console.error("No user data returned from login")
        setErrors({ email: "Login failed. Please try again." })
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Login exception:", error)
      setDebugInfo((prev) => ({ ...prev, exception: error.message }))

      if (error.message.includes("fetch")) {
        setErrors({ email: "Network connection failed. Please check your internet connection and try again." })
      } else {
        setErrors({ email: `Error: ${error.message}` })
      }
      setIsLoading(false)
    }
  }

  const SuccessPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in duration-300">
        <div className="mb-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Successful!</h2>
        <p className="text-gray-600 mb-4">Welcome back to Kalindar</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="transition-all duration-300 font-sans">
      {showSuccessPopup && <SuccessPopup />}

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">Welcome Back</h1>
      <p className="text-gray-600 mb-8 md:mb-10">
        Today is a new day. It's your day. You shape it.
        <br />
        Sign in to start managing your projects.
      </p>

      <form onSubmit={handleLogin} className="space-y-6">
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
              placeholder="Enter your password"
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

        {showEmailNotVerified && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-800 mb-1">Email Not Verified</h3>
                <p className="text-sm text-orange-700 mb-3">
                  You need to verify your email address before you can log in. Check your inbox for a verification link.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="text-orange-600 border-orange-300 hover:bg-orange-100"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-lg font-medium text-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Logging in...
            </div>
          ) : (
            "Log In"
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
        Don't have an account?{" "}
        <button onClick={onSwitchToSignup} className="text-blue-600 hover:text-blue-700 font-medium">
          Sign up
        </button>
      </p>
    </div>
  )
}
