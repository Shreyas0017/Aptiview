"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Stepper } from "@/components/ui/stepper"
import { ArrowLeft, ArrowRight, Check, Plus, X, Lightbulb, Briefcase, Target } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Types for templates and jobs
interface AITemplate {
  id: string
  name: string
  description: string
  context: string
  questions: string[]
}

interface Job {
  id: string
  title: string
  location: string
  type: string
  applicantsCount?: number
}

// Zod schemas for form validation
const templateCustomizationSchema = z.object({
  templateId: z.string().min(1, "Please select a template"),
  customContext: z.string().optional(),
  customQuestions: z.array(z.string()).default([]),
  scoring: z.object({
    communicationWeight: z.number().min(0).max(100).default(25),
    technicalWeight: z.number().min(0).max(100).default(25),
    problemSolvingWeight: z.number().min(0).max(100).default(25),
    culturalFitWeight: z.number().min(0).max(100).default(25),
  }).refine((data) => {
    const total = data.communicationWeight + data.technicalWeight + data.problemSolvingWeight + data.culturalFitWeight;
    return Math.abs(total - 100) <= 5; // Allow 5% tolerance
  }, {
    message: "Scoring weights should total approximately 100%",
  }),
  selectedJobs: z.array(z.string()).min(1, "Please select at least one job"),
  interviewDuration: z.number().min(10).max(60).default(20),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
})

type TemplateCustomizationForm = z.infer<typeof templateCustomizationSchema>

const steps = ["Select Template", "Customize", "Select Jobs"]

interface TemplateCustomizationWizardProps {
  onComplete?: () => void
  onCancel?: () => void
  showCloseButton?: boolean
  preSelectedJobId?: string | null
}

export default function TemplateCustomizationWizard({ 
  onComplete, 
  onCancel,
  showCloseButton = true,
  preSelectedJobId
}: TemplateCustomizationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [templates, setTemplates] = useState<AITemplate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [newQuestion, setNewQuestion] = useState("")
  
  const { getToken } = useAuth()
  const router = useRouter()

  const form = useForm<TemplateCustomizationForm>({
    resolver: zodResolver(templateCustomizationSchema),
    defaultValues: {
      templateId: "",
      customContext: "",
      customQuestions: [],
      scoring: {
        communicationWeight: 25,
        technicalWeight: 25,
        problemSolvingWeight: 25,
        culturalFitWeight: 25,
      },
      selectedJobs: [],
      interviewDuration: 20,
      difficultyLevel: "intermediate",
    },
  })

  // Fetch templates and jobs on mount
  useEffect(() => {
    fetchTemplates()
    fetchJobs()
  }, [])

  // Pre-select job if provided
  useEffect(() => {
    if (preSelectedJobId && jobs.length > 0) {
      const currentSelected = form.getValues("selectedJobs")
      if (!currentSelected.includes(preSelectedJobId)) {
        form.setValue("selectedJobs", [preSelectedJobId])
      }
    }
  }, [preSelectedJobId, jobs, form])

  const fetchTemplates = async () => {
    try {
      const token = await getToken()
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
      
      const response = await fetch(`${backendUrl}/api/users/ai-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) throw new Error('Failed to fetch templates')
      
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setTemplatesLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const token = await getToken()
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
      
      const response = await fetch(`${backendUrl}/api/users/my-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch jobs')
      
      const data = await response.json()
      setJobs(data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setJobsLoading(false)
    }
  }

  const onSubmit = async (data: TemplateCustomizationForm) => {
    try {
      setLoading(true)
      const token = await getToken()
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

      // Apply the customized template to selected jobs
      const response = await fetch(`${backendUrl}/api/users/apply-template-to-jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: data.templateId,
          customization: {
            context: data.customContext,
            questions: data.customQuestions,
            scoring: data.scoring,
            duration: data.interviewDuration,
            difficulty: data.difficultyLevel,
          },
          jobIds: data.selectedJobs,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to apply template: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      // Show success message with toast
      toast({
        title: "Template Applied Successfully",
        description: `Template has been applied to ${data.selectedJobs.length} job(s).`,
      })

      onComplete?.()
    } catch (error) {
      console.error('Error applying template:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      toast({
        title: "Error",
        description: `Failed to apply template: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addCustomQuestion = () => {
    if (newQuestion.trim()) {
      const currentQuestions = form.getValues("customQuestions")
      form.setValue("customQuestions", [...currentQuestions, newQuestion.trim()])
      setNewQuestion("")
    }
  }

  const removeCustomQuestion = (index: number) => {
    const currentQuestions = form.getValues("customQuestions")
    form.setValue("customQuestions", currentQuestions.filter((_, i) => i !== index))
  }

  const validateCurrentStep = async () => {
    switch (currentStep) {
      case 0:
        return await form.trigger("templateId")
      case 1:
        return await form.trigger(["customContext", "customQuestions", "scoring", "interviewDuration", "difficultyLevel"])
      case 2:
        return await form.trigger("selectedJobs")
      default:
        return true
    }
  }

  const handleStepNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid) {
      if (currentStep === steps.length - 1) {
        form.handleSubmit(onSubmit)()
      } else {
        handleNext()
      }
    }
  }

  // Step 1: Template Selection
  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose an AI Interview Template</h3>
        <p className="text-gray-600 mb-6">Select a base template that matches your interview focus. You'll be able to customize it in the next step.</p>
      </div>
      
      {templatesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : (
        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        field.value === template.id 
                          ? 'ring-2 ring-blue-500 border-blue-500' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => {
                        field.onChange(template.id)
                        setSelectedTemplate(template)
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                          {field.value === template.id && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <CardDescription className="text-sm">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm mb-1">Focus Areas:</h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{template.context}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm mb-1">Sample Questions:</h4>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {template.questions.slice(0, 2).map((question, index) => (
                              <li key={index} className="flex items-start">
                                <span className="mr-1">•</span>
                                <span className="line-clamp-1">{question}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )

  // Step 2: Template Customization
  const renderTemplateCustomization = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Customize Your Template</h3>
        <p className="text-gray-600 mb-6">Fine-tune the template to match your specific requirements and interviewing style.</p>
      </div>

      {selectedTemplate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Selected Template: {selectedTemplate.name}</h4>
          </div>
          <p className="text-blue-700 text-sm">{selectedTemplate.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Context and Questions */}
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="customContext"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Custom Interview Context</FormLabel>
                <FormDescription>
                  Add or modify the interviewing context. This will guide the AI's behavior during interviews.
                </FormDescription>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={selectedTemplate?.context || "Enter custom context..."}
                    className="min-h-[120px] resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customQuestions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Custom Questions</FormLabel>
                <FormDescription>
                  Add specific questions you want the AI to ask during interviews.
                </FormDescription>
                <FormControl>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Enter a custom question..."
                        onKeyPress={(e) => e.key === 'Enter' && addCustomQuestion()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={addCustomQuestion}
                        disabled={!newQuestion.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {field.value.map((question, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                          <span className="flex-1 text-sm">{question}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeCustomQuestion(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Right Column - Scoring and Settings */}
        <div className="space-y-6">
          <div className="space-y-4">
            <FormLabel className="text-base font-medium">Scoring Weights</FormLabel>
            <FormDescription>
              Adjust how much each area contributes to the final interview score (total should be 100%).
            </FormDescription>
            
            <div className="space-y-4">
              {[
                { key: 'communicationWeight', label: 'Communication Skills' },
                { key: 'technicalWeight', label: 'Technical Knowledge' },
                { key: 'problemSolvingWeight', label: 'Problem Solving' },
                { key: 'culturalFitWeight', label: 'Cultural Fit' },
              ].map(({ key, label }) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`scoring.${key}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm">{label}</FormLabel>
                        <span className="text-sm font-medium">{field.value}%</span>
                      </div>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            
            <div className={`text-sm font-medium ${
              Math.abs(Object.values(form.watch("scoring")).reduce((a, b) => a + b, 0) - 100) <= 5
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              Total: {Object.values(form.watch("scoring")).reduce((a, b) => a + b, 0)}% 
              {Math.abs(Object.values(form.watch("scoring")).reduce((a, b) => a + b, 0) - 100) > 5 && (
                <span className="text-xs text-red-500 ml-1">(should be ~100%)</span>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="interviewDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Interview Duration (minutes)</FormLabel>
                <FormDescription>
                  How long should the AI interview typically last?
                </FormDescription>
                <FormControl>
                  <div className="space-y-2">
                    <Slider
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={10}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>10 min</span>
                      <span className="font-medium">{field.value} minutes</span>
                      <span>60 min</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficultyLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Interview Difficulty</FormLabel>
                <FormDescription>
                  Set the complexity level for interview questions.
                </FormDescription>
                <FormControl>
                  <div className="flex gap-2">
                    {[
                      { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800' },
                      { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
                      { value: 'advanced', label: 'Advanced', color: 'bg-red-100 text-red-800' },
                    ].map((level) => (
                      <Badge
                        key={level.value}
                        variant={field.value === level.value ? "default" : "secondary"}
                        className={`cursor-pointer px-3 py-1 ${
                          field.value === level.value ? '' : level.color
                        }`}
                        onClick={() => field.onChange(level.value)}
                      >
                        {level.label}
                      </Badge>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )

  // Step 3: Job Selection
  const renderJobSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Jobs</h3>
        <p className="text-gray-600 mb-6">Choose which job postings should use this customized interview template.</p>
      </div>

      {jobsLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600 mb-4">You need to create at least one job posting to apply templates.</p>
          <Button onClick={() => router.push('/recruiter/create-job')}>
            Create Your First Job
          </Button>
        </div>
      ) : (
        <FormField
          control={form.control}
          name="selectedJobs"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <Card
                      key={job.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        field.value.includes(job.id)
                          ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => {
                        const newSelection = field.value.includes(job.id)
                          ? field.value.filter(id => id !== job.id)
                          : [...field.value, job.id]
                        field.onChange(newSelection)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={field.value.includes(job.id)}
                              onCheckedChange={() => {}} // Controlled by parent click
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{job.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>{job.location}</span>
                                <span>•</span>
                                <span>{job.type}</span>
                                {job.applicantsCount !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>{job.applicantsCount} applicants</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {field.value.includes(job.id) && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderTemplateSelection()
      case 1:
        return renderTemplateCustomization()
      case 2:
        return renderJobSelection()
      default:
        return renderTemplateSelection()
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Card className="border border-gray-200 shadow-lg">
        <CardHeader className="border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Customize AI Interview Template</CardTitle>
              <CardDescription className="text-gray-600">
                Configure your AI interviewer to match your specific requirements
              </CardDescription>
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="mt-6">
            <Stepper steps={steps} currentStep={currentStep} />
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {renderCurrentStep()}
            </form>
          </FormProvider>
        </CardContent>

        <div className="border-t border-gray-200 bg-gray-50/50 p-6">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handlePrevious}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>

            <Button
              type="button"
              onClick={handleStepNext}
              disabled={loading}
              className="bg-black hover:bg-gray-800"
            >
              {loading ? (
                "Processing..."
              ) : currentStep === steps.length - 1 ? (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Apply Template
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
