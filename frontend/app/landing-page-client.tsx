"use client"

import type React from "react"
import { useState, useEffect, useRef, forwardRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Play,
  CheckCircle,
  Users,
  Brain,
  BarChart3,
  Clock,
  Shield,
  Zap,
  Star,
  Award,
  TrendingUp,
  FileText,
  Video,
  Upload,
  Target,
  Github,
  Twitter,
  Linkedin,
  Mail,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AnimatedBeam } from "@/components/magicui/animated-beam"
import { cn } from "@/lib/utils"
import { SignInButton, SignedIn, SignedOut, useUser, useAuth } from "@clerk/nextjs"

const companies = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Apple",
  "Netflix",
  "Spotify",
  "Uber",
  "Airbnb",
  "Tesla",
]

const features = [
  {
    icon: Brain,
    title: "AI-Powered Interviews",
    description:
      "Advanced conversational AI that adapts to each role and candidate, creating natural interview experiences.",
    stats: "98% accuracy",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Comprehensive performance metrics with predictive insights and detailed candidate scoring.",
    stats: "50+ metrics",
  },
  {
    icon: Clock,
    title: "Lightning Fast",
    description: "5–10 minute automated screening saves 80% of review time while maintaining quality.",
    stats: "80% time saved",
  },
  {
    icon: Shield,
    title: "Bias-Free Evaluation",
    description: "Objective AI assessment reduces bias and ensures fair, consistent evaluation.",
    stats: "100% objective",
  },
  {
    icon: Users,
    title: "Smart Ranking",
    description: "Intelligent candidate ranking with customizable benchmarks and shortlists.",
    stats: "Auto-ranked",
  },
  {
    icon: Zap,
    title: "Real-time Monitoring",
    description: "Voice, video, and behavioral analysis for authentic responses and conduct.",
    stats: "Live tracking",
  },
]

const steps = [
  {
    number: "01",
    title: "Job Posting",
    description: "AI analyzes requirements and suggests optimal job descriptions with skill matching.",
    icon: FileText,
    details: ["AI-powered job descriptions", "Skill requirement analysis", "Market salary insights"],
  },
  {
    number: "02",
    title: "Candidate Screening",
    description: "CV parsing and automatic matching based on requirements and experience.",
    icon: Target,
    details: ["CV parsing & analysis", "Skill gap identification", "Experience matching"],
  },
  {
    number: "03",
    title: "AI Interview",
    description: "Dynamic 5–10 minute interviews with behavioral analysis and adaptive questioning.",
    icon: Video,
    details: ["Real-time video analysis", "Adaptive questioning", "Behavioral assessment"],
  },
  {
    number: "04",
    title: "Results & Analytics",
    description: "Predictive scoring and ranked recommendations for informed decisions.",
    icon: TrendingUp,
    details: ["Predictive scoring", "Detailed analytics", "Hiring recommendations"],
  },
]

const testimonials = [
  {
    quote:
      "This platform revolutionized our hiring process. We reduced screening time by 80% while improving candidate quality significantly.",
    author: "Sarah Chen",
    role: "Head of Talent Acquisition",
    company: "TechCorp",
    avatar: "SC",
    rating: 5,
  },
  {
    quote:
      "The AI interviews are incredibly natural and provide insights we never had before. It's truly game-changing for HR.",
    author: "Michael Rodriguez",
    role: "Recruiting Director",
    company: "InnovateLabs",
    avatar: "MR",
    rating: 5,
  },
  {
    quote:
      "Finally, a solution that eliminates bias and streamlines our workflow. Highly recommended for any company.",
    author: "Emily Johnson",
    role: "VP of People Operations",
    company: "FutureScale",
    avatar: "EJ",
    rating: 5,
  },
]

const faqs = [
  {
    q: "How does the AI interview work?",
    a: "Candidates join a short, role-aware conversation. The AI asks adaptive questions, analyzes responses in real time, and generates structured scores and insights for review.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use encryption at rest and in transit, scoped access, and audit trails. Enterprise security reviews and DPAs are available on request.",
  },
  {
    q: "Can we customize interviews and scoring?",
    a: "Absolutely. Tailor question banks, competencies, thresholds, and weightings per role, plus add knockout rules.",
  },
  {
    q: "What does setup look like?",
    a: "Most teams go live within a day—import roles, invite recruiters, share links with candidates, and monitor results in the dashboard.",
  },
]

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; pulse?: boolean; size?: "sm" | "md" | "lg"; label?: string }
>(({ className, children, pulse = false, size = "md", label }, ref) => {
  const sizeClasses = {
    sm: "size-12",
    md: "size-16",
    lg: "size-20",
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      {pulse && (
        <>
          <div className="absolute inset-0 rounded-full bg-gray-400 animate-ping opacity-20"></div>
          <div className="absolute inset-0 rounded-full bg-gray-400 animate-pulse opacity-10"></div>
        </>
      )}
      <div
        ref={ref}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full border-2 bg-white shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)]",
          sizeClasses[size],
          className,
        )}
      >
        {children}
      </div>
      {label && (
        <span className="mt-2 text-xs font-medium text-gray-700 whitespace-nowrap text-center max-w-[100px]">
          {label}
        </span>
      )}
    </div>
  )
})

Circle.displayName = "Circle"

function AnimatedDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const candidateRef = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLDivElement>(null)
  const aiRef = useRef<HTMLDivElement>(null)
  const interviewRef = useRef<HTMLDivElement>(null)
  const scoringRef = useRef<HTMLDivElement>(null)
  const analyticsRef = useRef<HTMLDivElement>(null)
  const recruiterRef = useRef<HTMLDivElement>(null)

  const [activePhase, setActivePhase] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const phases = ["Application", "Analysis", "Interview", "Scoring", "Analytics", "Decision"]

  // Fixed positions to avoid hydration mismatch
  const particlePositions = [
    { left: 10, top: 20 },
    { left: 25, top: 70 },
    { left: 45, top: 15 },
    { left: 60, top: 80 },
    { left: 75, top: 30 },
    { left: 85, top: 60 },
    { left: 15, top: 85 },
    { left: 90, top: 10 },
  ]

  useEffect(() => {
    setIsMounted(true)
    const interval = setInterval(() => {
      setActivePhase((prev) => (prev + 1) % phases.length)
    }, 2500)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
      <div className="relative flex h-[600px] w-full items-center justify-center overflow-hidden rounded-xl border bg-gray-50/50 shadow-xl" ref={containerRef}>
        {/* Floating Particles - only render after mount to avoid hydration mismatch */}
        {isMounted &&
          particlePositions.map((position, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-gray-400/30 rounded-full"
              animate={{ x: [0, i % 2 === 0 ? 20 : -20], y: [0, i % 3 === 0 ? 20 : -20], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 4 + (i % 3), repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: i * 0.3 }}
              style={{ left: `${position.left}%`, top: `${position.top}%` }}
            />
          ))}

        <div className="grid grid-cols-3 grid-rows-3 size-full max-h-[500px] max-w-[700px] gap-8 p-10">
          {/* Row 1 */}
          <div className="flex items-center justify-start">
            <Circle ref={candidateRef} className="bg-white border-gray-200" pulse={activePhase === 0} size="lg" label="Candidate">
              <Users className="w-8 h-8 text-gray-700" />
            </Circle>
          </div>
          <div className="flex items-center justify-center">
            <Circle ref={uploadRef} className="bg-white border-gray-200" pulse={activePhase === 1} label="Upload CV">
              <Upload className="w-6 h-6 text-gray-700" />
            </Circle>
          </div>
          <div className="flex items-center justify-end">
            <Circle ref={recruiterRef} className="bg-white border-gray-200" pulse={activePhase === 5} size="lg" label="Recruiter">
              <Award className="w-8 h-8 text-gray-700" />
            </Circle>
          </div>

          {/* Row 2 - AI Brain in center */}
          <div className="flex items-center justify-start">
            <Circle ref={interviewRef} className="bg-white border-gray-200" pulse={activePhase === 2} label="AI Interview">
              <Video className="w-6 h-6 text-gray-700" />
            </Circle>
          </div>
          <div className="flex items-center justify-center">
            <Circle ref={aiRef} className="size-28 bg-black border-gray-300" pulse={activePhase === 2} label="AI Core">
              <Brain className="w-14 h-14 text-white" />
            </Circle>
          </div>
          <div className="flex items-center justify-end">
            <Circle ref={scoringRef} className="bg-white border-gray-200" pulse={activePhase === 3} label="Scoring">
              <BarChart3 className="w-6 h-6 text-gray-700" />
            </Circle>
          </div>

          {/* Row 3 */}
          <div className="col-span-3 flex items-center justify-center">
            <Circle ref={analyticsRef} className="bg-white border-gray-200" pulse={activePhase === 4} label="Analytics">
              <TrendingUp className="w-6 h-6 text-gray-700" />
            </Circle>
          </div>
        </div>

        {/* Animated Beams */}
        <AnimatedBeam containerRef={containerRef} fromRef={candidateRef} toRef={uploadRef} curvature={-20} gradientStartColor="#a1a1aa" gradientStopColor="#52525b" duration={2.2} pathWidth={2.5} delay={0} dashed />

        <AnimatedBeam containerRef={containerRef} fromRef={uploadRef} toRef={aiRef} curvature={-40} gradientStartColor="#52525b" gradientStopColor="#18181b" duration={2.5} delay={0.3} pathWidth={2.5} glow />

        <AnimatedBeam containerRef={containerRef} fromRef={aiRef} toRef={interviewRef} curvature={40} gradientStartColor="#18181b" gradientStopColor="#52525b" duration={2.5} delay={0.6} pathWidth={2.5} glow />

        <AnimatedBeam containerRef={containerRef} fromRef={interviewRef} toRef={scoringRef} curvature={-20} gradientStartColor="#52525b" gradientStopColor="#a1a1aa" duration={2.2} delay={0.9} pathWidth={2.5} dashed />

        <AnimatedBeam containerRef={containerRef} fromRef={scoringRef} toRef={analyticsRef} curvature={-40} gradientStartColor="#a1a1aa" gradientStopColor="#d4d4d8" duration={2.5} delay={1.2} pathWidth={2.5} glow />

        <AnimatedBeam containerRef={containerRef} fromRef={analyticsRef} toRef={recruiterRef} curvature={-60} gradientStartColor="#d4d4d8" gradientStopColor="#a1a1aa" duration={2.8} delay={1.5} reverse pathWidth={2.5} dashed />

        {/* Phase Indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-white/90 backdrop-blur-md rounded-full px-4 py-2 shadow-md border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">{phases[activePhase]} Phase</span>
            </div>
          </div>
        </div>
      </div>

      {/* Process Timeline */}
      <div className="mt-8 flex justify-center">
        <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-full px-5 py-2.5 shadow-md border border-gray-200">
          {phases.map((phase, index) => (
            <motion.div
              key={index}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                activePhase === index ? "bg-gray-800 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              animate={{ scale: activePhase === index ? 1.05 : 1 }}
            >
              {phase}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function LandingPageClient() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const heroRef = useRef(null)
  const isHeroInView = useInView(heroRef, { once: true })
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const handleDashboardRedirect = async () => {
    if (!isLoaded || !user) return
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${backendUrl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const dbUser = await res.json()
    if (dbUser.role === "CANDIDATE") router.push("/candidate/dashboard")
    else if (dbUser.role === "RECRUITER") router.push("/dashboard")
    else router.push("/role-selection")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section ref={heroRef} className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[75vh]">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={isHeroInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8, ease: "easeOut" }}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={isHeroInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.6 }}>
                <Badge variant="outline" className="mb-8 font-medium border-gray-300 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800">
                  AI-Powered Hiring Platform
                </Badge>
              </motion.div>

              <motion.h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-8 leading-[1.1] tracking-tight dark:text-gray-100" initial={{ opacity: 0, y: 20 }} animate={isHeroInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.6 }}>
                Transform Your
                <span className="block text-gray-700 dark:text-gray-300">Hiring Process</span>
                <span className="text-3xl lg:text-4xl xl:text-5xl text-gray-500 font-medium block mt-2 dark:text-gray-400">with Intelligent AI</span>
              </motion.h1>

              <motion.p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl dark:text-gray-400" initial={{ opacity: 0, y: 20 }} animate={isHeroInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.4, duration: 0.6 }}>
                Experience the future of recruitment with AI-powered interviews, real-time analytics, and bias-free candidate evaluation. <span className="font-semibold text-gray-900 dark:text-gray-100">Reduce screening time by 80%</span> while improving hire quality.
              </motion.p>

              <motion.div className="flex flex-col sm:flex-row gap-4 mb-12" initial={{ opacity: 0, y: 20 }} animate={isHeroInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5, duration: 0.6 }}>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button size="lg" className="bg-black hover:bg-gray-800 font-semibold text-lg px-8 py-6 shadow-lg dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200">
                      Start Free Trial
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Button onClick={handleDashboardRedirect}>Go to Dashboard</Button>
                </SignedIn>
                <Link href="#demo" aria-label="Watch product demo">
                  <Button size="lg" variant="outline" className="font-semibold text-lg px-8 py-6 border-2 hover:bg-gray-50 bg-transparent dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-100">
                    <Play className="mr-2 w-5 h-5" />
                    Watch Demo
                  </Button>
                </Link>
              </motion.div>

              <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-6" initial={{ opacity: 0 }} animate={isHeroInView ? { opacity: 1 } : {}} transition={{ delay: 0.6, duration: 0.6 }}>
                {[
                  { icon: CheckCircle, text: "No setup required" },
                  { icon: Shield, text: "Enterprise security" },
                  { icon: Zap, text: "Instant results" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 border dark:bg-gray-800 dark:border-gray-700">
                    <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium dark:text-gray-300">{item.text}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div id="demo" initial={{ opacity: 0, x: 30 }} animate={isHeroInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}>
              <AnimatedDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Company Logos */}
      <section className="py-12 bg-gray-50/50 border-y dark:bg-gray-900 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 mb-8 text-sm font-medium dark:text-gray-400">Trusted by leading companies worldwide</p>
          <div className="overflow-hidden">
            <motion.div className="flex space-x-12" animate={{ x: [0, -1800] }} transition={{ duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}>
              {[...companies, ...companies].map((company, index) => (
                <div key={index} className="flex-shrink-0">
                  <div className="text-lg font-semibold text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap dark:hover:text-gray-300">
                    {company}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50/30 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-20" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="mb-6 font-medium border-gray-300 text-gray-700 bg-white dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800">
              Features
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight dark:text-gray-100">
              Everything You Need for
              <span className="block text-gray-700 dark:text-gray-300">Smarter Hiring</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed dark:text-gray-400">
              Our comprehensive AI platform handles every aspect of the interview process, from initial screening to final candidate ranking with unprecedented accuracy and efficiency.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ y: -8 }} className="group">
                <Card className="h-full hover:shadow-xl transition-all duration-500 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:group-hover:bg-gray-600">
                      <feature.icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {feature.title}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold bg-gray-100 text-gray-600 ml-2 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {feature.stats}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed dark:text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50/50 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-20" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="mb-6 font-medium border-gray-300 text-gray-700 bg-white dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800">
              Our Process
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight dark:text-gray-100">
              How It
              <span className="block text-gray-700 dark:text-gray-300">Actually Works</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed dark:text-gray-400">
              Experience the future of hiring through our intelligent, four-step process that transforms how you discover, evaluate, and select top talent.
            </p>
          </motion.div>

          <div className="space-y-16">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-12`}
              >
                <div className="flex-1 space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center dark:bg-white">
                      <step.icon className="w-6 h-6 text-white dark:text-black" />
                    </div>
                    <div className="text-4xl font-bold text-gray-200 dark:text-gray-700">{step.number}</div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 dark:text-gray-100">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-6 dark:text-gray-400">{step.description}</p>

                    <div className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center space-x-3">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full dark:bg-gray-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="font-medium bg-transparent dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-100">
                    Learn More
                    <ExternalLink className="ml-2 w-3 h-3" />
                  </Button>
                </div>

                <div className="flex-1">
                  <Card className="p-8 bg-white dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gray-50 rounded-lg p-6 dark:bg-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                          Step {step.number}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="h-3 bg-gray-200 rounded animate-pulse dark:bg-gray-600"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse dark:bg-gray-600"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse dark:bg-gray-500"></div>
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{step.title} Active</div>
                        <div className="flex space-x-1">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500" style={{ animationDelay: `${i * 0.1}s` }}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-200 dark:bg-gray-950 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { number: "80%", label: "Reduction in screening time", icon: Clock },
              { number: "95%", label: "Candidate satisfaction rate", icon: Star },
              { number: "10,000+", label: "Interviews conducted", icon: Users },
            ].map((stat, index) => (
              <motion.div key={index} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="text-center group">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:group-hover:bg-gray-700">
                  <stat.icon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="text-5xl font-bold text-gray-900 mb-3 tracking-tight dark:text-gray-100">{stat.number}</div>
                <div className="text-gray-600 font-medium text-lg dark:text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-20 bg-gray-50/50 px-4 sm:px-6 lg:px-8 dark:bg-gray-900 overflow-hidden">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 z-0 opacity-10 dark:opacity-5"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C9C9C' fillOpacity='0.4' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        ></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge
              variant="outline"
              className="mb-6 font-medium border-gray-300 text-gray-700 bg-white dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800"
            >
              Testimonials
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight dark:text-gray-100">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed dark:text-gray-400">
              Don't just take our word for it. Here's what industry leaders are saying about our platform.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto relative min-h-[240px]">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index === activeTestimonial ? 0 : 20 }}
                animate={{ opacity: index === activeTestimonial ? 1 : 0, x: index === activeTestimonial ? 0 : -20 }}
                className={`absolute inset-0 transition-opacity duration-500 ${index === activeTestimonial ? "opacity-100 relative" : "opacity-0 pointer-events-none"}`}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex justify-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-xl text-gray-700 mb-6 leading-relaxed italic dark:text-gray-300">"{testimonial.quote}"</blockquote>
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-semibold text-base dark:bg-gray-700 dark:text-gray-300">
                        {testimonial.avatar}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{testimonial.author}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {testimonial.role} at {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeTestimonial ? "bg-gray-800 scale-125 dark:bg-gray-100" : "bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
                }`}
                aria-label={`Show testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-black px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="mb-8 bg-white/10 text-white border-white/20 font-medium">
              Limited Time Offer
            </Badge>

            <h2 className="text-5xl lg:text-6xl font-bold text-white mb-8 tracking-tight leading-tight">
              Ready to Transform
              <span className="block text-gray-300">Your Hiring?</span>
            </h2>

            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join over <span className="font-bold text-white">10,000+ companies</span> already using our AI platform to make better hiring decisions faster and smarter.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <SignedIn>
                <Button onClick={handleDashboardRedirect}>Go to Dashboard</Button>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-semibold text-lg px-10 py-6 shadow-xl dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </SignInButton>
              </SignedOut>
              <Link href="#demo" aria-label="Schedule a live demo">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-semibold text-lg px-10 py-6 bg-transparent">
                  <Play className="mr-2 w-5 h-5" />
                  Schedule Demo
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                { icon: CheckCircle, text: "No credit card required" },
                { icon: Shield, text: "14-day free trial" },
                { icon: Zap, text: "Cancel anytime" },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-center space-x-3 text-gray-300 p-4 rounded-lg border border-white/10 bg-white/5">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 font-medium border-gray-300 text-gray-700 bg-white dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800">
              FAQ
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">Answers to common questions</h2>
          </motion.div>

          <Accordion type="single" collapsible className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border dark:bg-gray-800/60 dark:border-gray-700">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-gray-900 dark:text-gray-100">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-400">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-8 text-center">
            <Link href="/pricing">
              <Button className="bg-black hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200">
                See pricing
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-8 mb-12">
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-xl font-semibold">Aptiview</span>
                </div>

                <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                  Revolutionizing recruitment with cutting-edge AI technology. We're building the future of hiring, one interview at a time.
                </p>

                <div className="flex space-x-3">
                  {[
                    { Icon: Twitter, href: "#", label: "Twitter" },
                    { Icon: Linkedin, href: "#", label: "LinkedIn" },
                    { Icon: Github, href: "#", label: "GitHub" },
                    { Icon: Mail, href: "#", label: "Email" },
                  ].map(({ Icon, href, label }, index) => (
                    <a
                      key={index}
                      href={href}
                      aria-label={label}
                      className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-3">
                  {["Features", "Pricing", "API Documentation", "Integrations", "Security", "Enterprise"].map(
                    (item, index) => (
                      <li key={index}>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                          {item}
                        </a>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-3">
                  {["About", "Blog", "Careers", "Press", "Partners", "Contact"].map((item, index) => (
                    <li key={index}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Separator className="bg-gray-800 mb-8" />

            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-400 mb-4 md:mb-0">© 2024 Aptiview. All rights reserved.</div>
              <div className="flex space-x-6">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item, index) => (
                  <a key={index} href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
