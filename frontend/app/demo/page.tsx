import type { Metadata } from "next"
import AIDemoClientPage from "./AIDemoClientPage"

export const metadata: Metadata = {
  title: "AI Interview Demo",
  description: "Experience a simulated AI-powered interview with Aptiview.",
  keywords: ["AI interview demo", "simulated interview", "AI chatbot interview"],
}

export default function AIDemoPage() {
  return <AIDemoClientPage />
}
