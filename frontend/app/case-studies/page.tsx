import { CardFooter } from "@/components/ui/card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Read success stories from companies transforming their hiring with Aptiview's platform.",
  keywords: ["AI hiring success stories", "recruitment case studies", "AI interview results"],
}

export default function CaseStudiesPage() {
  const caseStudies = [
    {
      title: "TechCorp: 80% Reduction in Screening Time",
      description:
        "Discover how TechCorp leveraged Aptiview to drastically cut down their initial screening time while improving candidate quality.",
      industry: "Software",
      results: ["80% time saved", "30% higher quality hires", "2x faster hiring cycle"],
      link: "#",
    },
    {
      title: "InnovateLabs: Enhancing Candidate Experience with AI",
      description:
        "Learn how InnovateLabs transformed their candidate journey, making interviews more engaging and fair with our AI platform.",
      industry: "Biotech",
      results: ["95% candidate satisfaction", "Bias reduction", "Improved employer brand"],
      link: "#",
    },
    {
      title: "Global Retail Co.: Scaling Recruitment with Automation",
      description:
        "See how a major retail company automated their high-volume recruitment, handling thousands of applications efficiently.",
      industry: "Retail",
      results: ["10,000+ interviews/month", "Reduced cost-per-hire", "Consistent evaluation"],
      link: "#",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto text-center mb-12 sm:mb-16">
        <Badge variant="outline" className="mb-4 sm:mb-6 font-medium border-gray-300 text-gray-700 bg-white">
          Case Studies
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">Success Stories</h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          See how leading companies are transforming their hiring with Aptiview.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
        {caseStudies.map((study, index) => (
          <Card
            key={index}
            className="flex flex-col justify-between border-gray-200 bg-white hover:shadow-lg transition-shadow duration-300"
          >
            <CardHeader>
              <Badge variant="secondary" className="mb-2 self-start bg-gray-100 text-gray-600">
                {study.industry}
              </Badge>
              <CardTitle className="text-xl font-bold text-gray-900">{study.title}</CardTitle>
              <CardDescription className="text-gray-600">{study.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700">
                {study.results.map((result, resultIndex) => (
                  <li key={resultIndex} className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                    {result}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full bg-transparent border-gray-300 hover:bg-gray-50">
                Read Full Study <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
