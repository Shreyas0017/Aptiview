import type { Metadata } from "next"
import RecruiterProfileSetupClientPage from "./RecruiterProfileSetupClientPage"

export const metadata: Metadata = {
  title: "Recruiter Profile Setup",
  description: "Set up your company profile to start using Aptiview as a recruiter.",
  keywords: ["recruiter profile", "company setup", "Aptiview recruiter"],
}

export default function RecruiterProfileSetupPage() {
  return <RecruiterProfileSetupClientPage />
}
