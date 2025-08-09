import type { Metadata } from "next" // Import Metadata type
import LandingPageClient from "./landing-page-client"

// Static metadata for the landing page
export const metadata: Metadata = {
  title: "Home",
  description:
    "Aptiview: Revolutionize your hiring process with AI-powered interviews and smart candidate evaluation.",
  keywords: ["AI hiring", "recruitment AI", "AI interviews", "talent acquisition"],
}

export default function LandingPage() {
  return <LandingPageClient />
}
