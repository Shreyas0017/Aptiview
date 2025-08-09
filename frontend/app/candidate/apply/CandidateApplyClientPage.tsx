"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Video, Calendar } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown" // Import ReactMarkdown
import remarkGfm from "remark-gfm" // Import remarkGfm for GitHub Flavored Markdown
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import '../../../node_modules/katex/dist/katex.min.css';
import { useAuth } from "@clerk/nextjs"

interface CandidateApplyClientPageProps {
  jobId?: string
  initialJobTitle?: string
}

interface Job {
  id: string
  title: string
  company: string
  location: string
  type: string
  description: string
  createdAt: string
  updatedAt: string
  recruiterId: string
}

export default function CandidateApplyClientPage({ jobId, initialJobTitle }: CandidateApplyClientPageProps) {
  const [job, setJob] = useState<Job | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jobLoading, setJobLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applicationData, setApplicationData] = useState<any>(null)
  const [interviewLink, setInterviewLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    linkedin: "",
    portfolio: "",
    jobRole: initialJobTitle || "",
    cvFile: null as File | null,
    coverLetter: "",
  })
  const router = useRouter()
  const { getToken } = useAuth()
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Fetch job data when jobId is available
  useEffect(() => {
    async function fetchJob() {
      if (!jobId) return
      
      setJobLoading(true)
      try {
        const token = await getToken()
        if (!token) throw new Error("Not authenticated")
        
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
        const res = await fetch(`${backendUrl}/api/users/jobs/${jobId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })
        
        if (!res.ok) {
          throw new Error("Failed to fetch job details")
        }
        
        const jobData = await res.json()
        setJob(jobData)
        setFormData(prev => ({ ...prev, jobRole: jobData.title }))
      } catch (err: any) {
        setError(err.message || "Failed to load job details")
        console.error("Job fetch error:", err)
      } finally {
        setJobLoading(false)
      }
    }
    
    fetchJob()
  }, [jobId, getToken])

  useEffect(() => {
    if (job) {
      setFormData((prev) => ({ ...prev, jobRole: job.title }))
    } else if (initialJobTitle) {
      setFormData((prev) => ({ ...prev, jobRole: initialJobTitle }))
    }
  }, [job, initialJobTitle])

  // Check if already applied on mount
  useEffect(() => {
    if (isSubmitted) return; // Don't check if just submitted
    async function checkIfAlreadyApplied() {
      if (!jobId) return;
      const token = await getToken();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${backendUrl}/api/users/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const applications = await res.json();
        const applied = applications.some((app: any) => app.jobId === jobId);
        setAlreadyApplied(applied);
      }
    }
    checkIfAlreadyApplied();
  }, [jobId, getToken, isSubmitted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, cvFile: e.target.files![0] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!job) {
      setError("Job information not found");
      return;
    }

    if (alreadyApplied) {
      setError("You have already applied to this job.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      
      // Convert CV file to base64 (data URL) if present using FileReader (browser-safe)
      let resumeBase64: string | undefined = undefined;
      if (formData.cvFile) {
        const file = formData.cvFile;
        resumeBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${backendUrl}/api/users/jobs/${job.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeBase64,
          coverLetter: formData.coverLetter || undefined,
        }),
      });
      
      if (!res.ok) {
        if (res.status === 409) {
          setError("You have already applied to this job.");
          setAlreadyApplied(true);
          return;
        }
        const errText = await res.text();
        throw new Error(errText || "Failed to submit application");
      }
      
      const applicationResult = await res.json();
      setApplicationData({
        id: applicationResult.id,
        job: job
      });
      // Immediately schedule interview for now
      const interviewRes = await fetch(`${backendUrl}/api/interviews/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicationId: applicationResult.id,
          scheduledAt: new Date().toISOString()
        })
      });
      if (!interviewRes.ok) {
        setError("Failed to schedule interview automatically.");
        return;
      }
      const interviewData = await interviewRes.json();
      setInterviewLink(interviewData.interviewLink);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      console.error("Application submission error:", err);
    } finally {
      setLoading(false);
    }
  }

  const displayJobTitle = formData.jobRole || "a Job"

  // Show loading state while fetching job
  if (jobLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <Card className="w-full max-w-md text-center shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Loading Job Details...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show error state if job fetch failed
  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <Card className="w-full max-w-md text-center shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
              Error Loading Job
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isSubmitted && alreadyApplied) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <Card className="w-full max-w-md text-center shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Already Applied
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              You have already applied to this job. You cannot apply again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/candidate/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <Card className="w-full max-w-md text-center shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Application Submitted!
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your application for the <span className="font-semibold">{displayJobTitle}</span> role is complete.<br />
              <span className="text-blue-700 dark:text-blue-300">Your AI interview is scheduled and valid for the next 24 hours.</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {interviewLink && (
              <Button 
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              >
                <a href={interviewLink} target="_blank" rel="noopener noreferrer">
                  <Video className="h-5 w-5 mr-2" /> Join AI Interview
                </a>
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => router.push("/candidate/dashboard")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The interview link will expire 24 hours after scheduling.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
      <Card className="w-full max-w-5xl shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Apply for {displayJobTitle}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Fill out the form below to submit your application.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-8">
          {/* Left Column: Job Description */}
          <div className="flex-1 lg:max-w-[50%] lg:border-r lg:pr-8 lg:py-2 dark:lg:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 mb-4 dark:text-gray-100">Job Description</h3>
            {job ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose max-w-none text-gray-700 leading-relaxed dark:text-gray-300 dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {job.description}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[600px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4 text-center dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
                <p>No job description available. Please select a job from the dashboard or provide a job title.</p>
              </div>
            )}
          </div>

          {/* Right Column: Application Form */}
          <div className="flex-1 lg:max-w-[50%] lg:pl-8 lg:py-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="border-gray-300 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john.doe@example.com"
                  className="border-gray-300 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className="border-gray-300 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="linkedin" className="text-gray-700 dark:text-gray-300">
                  LinkedIn Profile URL (Optional)
                </Label>
                <Input
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/johndoe"
                  className="border-gray-300 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="portfolio" className="text-gray-700 dark:text-gray-300">
                  Portfolio/Website URL (Optional)
                </Label>
                <Input
                  id="portfolio"
                  name="portfolio"
                  type="url"
                  value={formData.portfolio}
                  onChange={handleChange}
                  placeholder="https://johndoe.com"
                  className="border-gray-300 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="jobRole" className="text-gray-700 dark:text-gray-300">
                  Applying For
                </Label>
                <Input
                  id="jobRole"
                  name="jobRole"
                  value={formData.jobRole}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Senior Software Engineer"
                  readOnly={!!job || !!initialJobTitle} // Make read-only if pre-filled
                  className="border-gray-300 focus-visible:ring-gray-400 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="cvFile" className="text-gray-700 dark:text-gray-300">
                  Upload CV (PDF, DOCX)
                </Label>
                <Input
                  id="cvFile"
                  name="cvFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  required
                  className="border-gray-300 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
                {formData.cvFile && (
                  <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">Selected file: {formData.cvFile.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="coverLetter" className="text-gray-700 dark:text-gray-300">
                  Cover Letter (Optional)
                </Label>
                <Textarea
                  id="coverLetter"
                  name="coverLetter"
                  value={formData.coverLetter}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Tell us about your experience and why you're a great fit..."
                  className="border-gray-300 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !job}
                className="w-full bg-black hover:bg-gray-800 text-lg py-6 dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
              {error && (
                <p className="text-red-600 text-sm text-center dark:text-red-400">{error}</p>
              )}
              {!job && jobId && (
                <p className="text-yellow-600 text-sm text-center dark:text-yellow-400">
                  Job information is still loading...
                </p>
              )}
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
