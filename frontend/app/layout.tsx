import type React from "react"
import type { Metadata } from "next"
import {
  ClerkProvider,
  SignedIn,
} from "@clerk/nextjs";
import "./globals.css"
import "lenis/dist/lenis.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { MainNavigation } from "@/components/main-nav"
import { GlobalUserProvisioner } from "@/components/GlobalUserProvisioner";
import { RoleRedirector } from "@/components/RoleRedirector";
import LenisRoot from "@/components/LenisRoot";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Aptiview - AI-Powered Hiring Platform",
    template: "%s | Aptiview",
  },
  description:
    "Revolutionize your hiring process with Aptiview's intelligent platform. Leverage AI-powered interviews, real-time analytics, and bias-free candidate evaluation to find top talent faster.",
  keywords: [
    "AI hiring",
    "recruitment AI",
    "AI interviews",
    "talent acquisition",
    "HR tech",
    "candidate screening",
    "bias-free hiring",
  ],
  openGraph: {
    title: "Aptiview - AI-Powered Hiring Platform",
    description:
      "Revolutionize your hiring process with Aptiview's intelligent platform. Leverage AI-powered interviews, real-time analytics, and bias-free candidate evaluation to find top talent faster.",
    url: "https://www.talentai.com",
    siteName: "Aptiview",
    images: [
      {
        url: "/placeholder.svg?height=630&width=1200",
        width: 1200,
        height: 630,
        alt: "Aptiview - AI-Powered Hiring Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aptiview - AI-Powered Hiring Platform",
    description:
      "Revolutionize your hiring process with Aptiview's intelligent platform. Leverage AI-powered interviews, real-time analytics, and bias-free candidate evaluation to find top talent faster.",
    creator: "@TalentAI",
    images: ["/placeholder.svg?height=675&width=1200"],
  },
  authors: [{ name: "Aptiview Team" }],
  creator: "Aptiview",
  publisher: "Aptiview",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <SignedIn>
        <GlobalUserProvisioner />
        <RoleRedirector />
      </SignedIn>
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LenisRoot>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange={false}
            storageKey="talent-ai-theme"
          >
            <MainNavigation />
            <div className="pt-16 bg-gray-50/50 dark:bg-gray-900 min-h-[calc(100vh-4rem)]">{children}</div>
          </ThemeProvider>
        </LenisRoot>
      </body>
    </html>
    </ClerkProvider>
  )
}
