"use client"

import { useState } from "react"
import SignupForm from "./SignupForm"
import LoginForm from "./LoginForm"
import { ROUTES } from "../../lib/navigation"

export default function AuthPage({ currentRoute, navigate }) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleSignupSuccess = () => {
    // Redirect to login after successful signup
    setIsTransitioning(true)
    setTimeout(() => {
      navigate(ROUTES.AUTH_LOGIN)
      setIsTransitioning(false)
    }, 150)
  }

  const switchToLogin = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      navigate(ROUTES.AUTH_LOGIN)
      setIsTransitioning(false)
    }, 150)
  }

  const switchToSignup = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      navigate(ROUTES.AUTH_SIGNUP)
      setIsTransitioning(false)
    }, 150)
  }

  const KalendarLogo = () => (
    <div className="text-4xl md:text-5xl font-bold mb-6 md:mb-8 font-sans">
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

  const isSignup = currentRoute === ROUTES.AUTH_SIGNUP

  return (
    <div className="min-h-screen flex font-sans">
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
            className={`transition-all duration-300 ${
              isTransitioning ? "opacity-0 transform translate-y-4" : "opacity-100 transform translate-y-0"
            }`}
          >
            {isSignup ? (
              <SignupForm onSignupSuccess={handleSignupSuccess} onSwitchToLogin={switchToLogin} />
            ) : (
              <LoginForm onSwitchToSignup={switchToSignup} />
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        {isSignup ? (
          <>
            <div
              className="flex-1 bg-cover bg-center order-1"
              style={{ backgroundImage: `url('/floral-background.png')` }}
            />
            <div className="flex-1 flex items-center justify-center p-12 bg-white order-2">
              <div className="w-full max-w-md">
                <KalendarLogo />
                <div
                  className={`transition-all duration-300 ${
                    isTransitioning ? "opacity-0 transform translate-y-4" : "opacity-100 transform translate-y-0"
                  }`}
                >
                  <SignupForm onSignupSuccess={handleSignupSuccess} onSwitchToLogin={switchToLogin} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex items-center justify-center p-12 bg-white order-1">
              <div className="w-full max-w-md">
                <KalendarLogo />
                <div
                  className={`transition-all duration-300 ${
                    isTransitioning ? "opacity-0 transform translate-y-4" : "opacity-100 transform translate-y-0"
                  }`}
                >
                  <LoginForm onSwitchToSignup={switchToSignup} />
                </div>
              </div>
            </div>
            <div
              className="flex-1 bg-cover bg-center order-2"
              style={{ backgroundImage: `url('/floral-background.png')` }}
            />
          </>
        )}
      </div>
    </div>
  )
}
