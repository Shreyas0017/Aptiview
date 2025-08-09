import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Explore Aptiview's transparent pricing plans for AI-powered hiring solutions.",
  keywords: ["AI hiring pricing", "recruitment software cost", "AI interview plans"],
}

export default function PricingPage() {
  const pricingTiers = [
    {
      name: "Free Tier",
      price: "$0",
      period: "per month",
      description: "Perfect for small teams getting started with AI hiring.",
      features: ["1 Job Posting", "Up to 5 AI Interviews/month", "Basic Analytics", "Email Support"],
      buttonText: "Get Started Free",
      highlight: false,
    },
    {
      name: "Pro Plan",
      price: "$99",
      period: "per month",
      description: "Ideal for growing businesses needing advanced features.",
      features: [
        "Unlimited Job Postings",
        "Up to 50 AI Interviews/month",
        "Advanced Analytics & Reporting",
        "Priority Email Support",
        "Customizable Benchmarks",
      ],
      buttonText: "Start Pro Trial",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored solutions for large organizations with specific needs.",
      features: [
        "All Pro Plan Features",
        "Unlimited AI Interviews",
        "Dedicated Account Manager",
        "API Access & Integrations",
        "On-premise Deployment Options",
        "24/7 Phone Support",
      ],
      buttonText: "Contact Sales",
      highlight: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto text-center mb-12 sm:mb-16">
        <Badge variant="outline" className="mb-4 sm:mb-6 font-medium border-gray-300 text-gray-700 bg-white">
          Pricing
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Choose the plan that best fits your hiring needs. No hidden fees, just powerful AI.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
        {pricingTiers.map((tier, index) => (
          <Card
            key={index}
            className={`flex flex-col justify-between border-2 transition-all duration-300 ${
              tier.highlight ? "border-black shadow-xl md:scale-105" : "border-gray-200 hover:shadow-lg"
            }`}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900">{tier.name}</CardTitle>
              <p className="text-gray-600">{tier.description}</p>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">{tier.price}</span>
                <span className="text-gray-600 text-lg">{tier.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full text-base sm:text-lg py-3 sm:py-6 ${tier.highlight ? "bg-black hover:bg-gray-800" : "bg-gray-800 hover:bg-gray-700 text-white"}`}
              >
                {tier.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
