"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle } from "lucide-react"
import { useAuth, useUser } from "@clerk/nextjs"

export default function RecruiterProfileSetupClientPage() {
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const token = await getToken()
      if (!token || !user) throw new Error("Not authenticated")
      const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
      const res = await fetch(`${backendUrl}/api/users/provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          role: "RECRUITER",
          profile: {
            company: companyName,
            industry,
            companySize,
            contactNumber,
          },
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Failed to save profile: ${errText}`)
      }
      setIsSubmitted(true)
      
      // Set flag to indicate user just completed profile setup
      if (typeof window !== "undefined") {
        localStorage.setItem("justSignedIn", "true")
      }
      
      setTimeout(() => {
        // Force a page reload to ensure fresh user data
        window.location.href = "/dashboard"
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Unknown error")
      // Log error for debugging
      console.error("Profile save error:", err)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-3xl font-bold text-gray-900">Profile Created!</CardTitle>
            <CardDescription className="text-gray-600">Redirecting you to your dashboard...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-900">Recruiter Profile Setup</CardTitle>
          <CardDescription className="text-gray-600">Set up your company profile to start posting jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div>
              <Label htmlFor="companyName" className="text-gray-700">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Corp" className="border-gray-300 focus-visible:ring-gray-400" />
            </div>
            <div>
              <Label htmlFor="industry" className="text-gray-700">Industry</Label>
              <Input id="industry" value={industry} onChange={e => setIndustry(e.target.value)} required placeholder="Software, Finance, Healthcare" className="border-gray-300 focus-visible:ring-gray-400" />
            </div>
            <div>
              <Label htmlFor="companySize" className="text-gray-700">Company Size</Label>
              <Select value={companySize} onValueChange={setCompanySize} required>
                <SelectTrigger id="companySize" className="border-gray-300 focus-visible:ring-gray-400">
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-1000">201-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contactNumber" className="text-gray-700">Contact Number (Optional)</Label>
              <Input id="contactNumber" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="+1 (555) 123-4567" className="border-gray-300 focus-visible:ring-gray-400" />
            </div>
            <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-lg py-6">Save Profile & Go to Dashboard</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
