"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase } from "lucide-react"
import { useUser } from "@clerk/nextjs"

export default function RoleSelectionClientPage() {
  const router = useRouter()
  const { user } = useUser()

  const handleRoleSelect = async (role: "recruiter" | "candidate") => {
    if (user) {
      // Use unsafeMetadata to avoid Clerk 422 error
      await user.update({ unsafeMetadata: { role: role.toUpperCase() } })
    }
    if (role === "recruiter") {
      router.push("/recruiter-profile-setup")
    } else {
      router.push("/candidate-profile-setup")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select your role</CardTitle>
          <CardDescription>
            Are you a recruiter or a candidate?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => handleRoleSelect("recruiter")}
          >
            <Briefcase className="h-5 w-5" /> Recruiter
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => handleRoleSelect("candidate")}
          >
            <Users className="h-5 w-5" /> Candidate
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
