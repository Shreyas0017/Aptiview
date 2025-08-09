"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuth } from "@clerk/nextjs"

interface Job {
  id: string
  title: string
  description: string
  location: string
  type: string
  createdAt: string
  recruiter: {
    company: string
  }
}

export default function JobDetailClientPage() {
  const router = useRouter()
  const params = useParams()
  const { getToken } = useAuth()
  const jobId = params?.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return

      setLoading(true)
      setError(null)

      try {
        const token = await getToken()
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

        const res = await fetch(`${backendUrl}/api/users/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch job details")
        }

        const jobData = await res.json()
        setJob(jobData)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId, getToken])

  // Check if already applied
  useEffect(() => {
    const checkIfApplied = async () => {
      if (!jobId) return;
      const token = await getToken();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${backendUrl}/api/users/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const applications = await res.json();
        const applied = applications.some((app: any) => app.jobId === jobId);
        setHasApplied(applied);
      }
    };
    checkIfApplied();
  }, [jobId, getToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4 dark:border-gray-100"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <div className="text-center text-red-500">
          <p className="text-lg font-semibold mb-2">Error loading job details</p>
          <p>{error}</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>

        <Card className="shadow-lg border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-4">
            <Badge
              variant="secondary"
              className="mb-2 self-start bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {job.recruiter.company}
            </Badge>
            <CardTitle className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 dark:text-gray-100">
              {job.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm sm:text-base dark:text-gray-400">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" /> {job.location}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" /> {job.type}
              </div>
              <div className="flex items-center">
                Posted {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none text-gray-700 leading-relaxed dark:text-gray-300 dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {job.description}
              </ReactMarkdown>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {hasApplied ? (
                <Button
                  disabled
                  className="bg-gray-400 cursor-not-allowed text-lg py-6 flex-1"
                >
                  Already Applied
                </Button>
              ) : (
                <Button
                  asChild
                  className="bg-black hover:bg-gray-800 text-lg py-6 flex-1 dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200"
                >
                  <Link href={`/candidate/apply?jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}`}>
                    Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push("/candidate/jobs")}
                className="border-gray-300 hover:bg-gray-50 text-lg py-6 flex-1 bg-transparent dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-100"
              >
                Browse More Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
