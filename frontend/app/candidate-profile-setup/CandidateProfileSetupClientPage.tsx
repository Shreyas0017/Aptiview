"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { useAuth, useUser } from "@clerk/nextjs"

export default function CandidateProfileSetupClientPage() {
  const [education, setEducation] = useState("")
  const [workExperience, setWorkExperience] = useState("")
  const [skills, setSkills] = useState("")
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
          role: "CANDIDATE",
          profile: {
            education,
            experience: workExperience,
            skills,
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
        window.location.href = "/candidate/dashboard"
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
          <CardTitle className="text-3xl font-bold text-gray-900">Candidate Profile Setup</CardTitle>
          <CardDescription className="text-gray-600">Tell us about your background to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div>
              <Label htmlFor="education" className="text-gray-700">Education</Label>
              <Input id="education" value={education} onChange={e => setEducation(e.target.value)} required placeholder="B.Sc. in Computer Science" className="border-gray-300 focus-visible:ring-gray-400" />
            </div>
            <div>
              <Label htmlFor="workExperience" className="text-gray-700">Work Experience</Label>
              <Textarea id="workExperience" value={workExperience} onChange={e => setWorkExperience(e.target.value)} required placeholder="2 years at Google, 1 year at Meta" className="border-gray-300 focus-visible:ring-gray-400" />
            </div>
            <div>
              <Label htmlFor="skills" className="text-gray-700">Skills (Comma-separated, e.g., JavaScript, React, Node.js)</Label>
              <Input id="skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="JavaScript, React, Node.js, AWS" className="border-gray-300 focus-visible:ring-gray-400" />
            </div>
            <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-lg py-6">Save Profile & Go to Dashboard</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
