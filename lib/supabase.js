import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sbljosjchhvlsaijqruu.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibGpvc2pjaGh2bHNhaWpxcnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MTIyNTAsImV4cCI6MjA2NDE4ODI1MH0.rGG6pShoPJYwh5HF8wVT7ONJpm_cjUvT6AqR0bnCFxE"

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration")
  throw new Error("Missing Supabase configuration. Please check your environment variables.")
}

console.log("Initializing Supabase client...")
console.log("Supabase URL:", supabaseUrl)
console.log("API Key (first 20 chars):", supabaseAnonKey.substring(0, 20) + "...")

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Test connection
supabase.auth
  .getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error("Supabase connection test failed:", error)
    } else {
      console.log("Supabase connection test successful")
    }
  })
  .catch((err) => {
    console.error("Supabase connection error:", err)
  })
