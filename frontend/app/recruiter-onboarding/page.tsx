import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Settings, Users, BarChart3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Recruiter Onboarding",
  description: "Follow these simple steps to get started with Aptiview and revolutionize your hiring process.",
  keywords: ["recruiter onboarding", "AI hiring setup", "get started with Aptiview"],
}

export default function RecruiterOnboardingPage() {
  const onboardingSteps = [
    {
      icon: Settings,
      title: "Set Up Your Account",
      description: "Configure your company profile, team members, and initial preferences.",
      details: ["Company details", "Team management", "Integrations setup"],
    },
    {
      icon: Users,
      title: "Create Your First Job Posting",
      description: "Define job roles, responsibilities, and desired candidate profiles with AI assistance.",
      details: ["AI-powered job descriptions", "Skill matching", "Interview template selection"],
    },
    {
      icon: BarChart3,
      title: "Review Analytics & Shortlist",
      description: "Access comprehensive candidate reports, scores, and use smart ranking for efficient shortlisting.",
      details: ["Detailed interview reports", "Candidate scoring & ranking", "Customizable benchmarks"],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto text-center mb-12 sm:mb-16">
        <Badge variant="outline" className="mb-4 sm:mb-6 font-medium border-gray-300 text-gray-700 bg-white">
          Onboarding
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">
          Get Started with Aptiview
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Follow these simple steps to revolutionize your hiring process.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
        {onboardingSteps.map((step, index) => (
          <Card
            key={index}
            className="flex flex-col justify-between border-gray-200 bg-white hover:shadow-lg transition-shadow duration-300"
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4">
                <step.icon className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Step {index + 1}: {step.title}
              </CardTitle>
              <CardDescription className="text-gray-600">{step.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm text-gray-700">
                {step.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardContent className="pt-0">
              <Button variant="outline" className="w-full bg-transparent border-gray-300 hover:bg-gray-50">
                Start This Step
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 sm:mt-12 text-center">
        <p className="text-base sm:text-lg text-gray-700 mb-4">Need personalized assistance?</p>
        <Button size="lg" className="bg-black hover:bg-gray-800">
          Schedule an Onboarding Call
        </Button>
      </div>
    </div>
  )
}
