"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Users, Briefcase, Eye, Calendar, MapPin, BarChart3, Trash2, Edit, Settings, ChevronDown, ChevronUp, Wand2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import RecruiterInterviewDashboard from "@/components/RecruiterInterviewDashboard";
import TemplateCustomizationModal from "@/components/TemplateCustomizationModal";

interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  createdAt: string;
  applicantsCount: number;
  interviewsCount: number;
  shortlistedCount: number;
  // AI Configuration fields
  interviewContext?: string;
  customQuestions?: string;
  aiTemplateId?: string;
  customInterviewContext?: string;
  customQuestionsList?: string[];
  scoringWeights?: any;
  interviewDuration?: number;
  difficultyLevel?: string;
  _count?: {
    applications?: number;
  };
}

interface DashboardStats {
  totalJobs: number;
  totalApplications: number;
  pendingApplications: number;
  scheduledInterviews: number;
}

export default function RecruiterDashboard() {
  const router = useRouter();
  const { getToken } = useAuth();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    scheduledInterviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobApplications, setJobApplications] = useState<Record<string, any[]>>({});
  const [templateCustomizationOpen, setTemplateCustomizationOpen] = useState(false);
  const [selectedJobForCustomization, setSelectedJobForCustomization] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchAITemplates();
  }, []);

  const fetchAITemplates = async () => {
    try {
      setTemplatesLoading(true);
      const token = await getToken();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const response = await fetch(`${backendUrl}/api/users/ai-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI templates');
      }

      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching AI templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(jobId);
      const token = await getToken();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const response = await fetch(`${backendUrl}/api/users/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete job');
        } else {
          // If it's HTML, it's likely a server error page
          const errorText = await response.text();
          console.error('Server returned HTML error:', errorText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      // Remove job from state
      setJobs(jobs.filter(job => job.id !== jobId));
  // Refresh stats and any other derived data
  fetchDashboardData();
      
      // Show success message
      alert('Job deleted successfully');
    } catch (error) {
      console.error('Error deleting job:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete job');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleTemplateCustomizationComplete = () => {
    // Refresh jobs data to reflect any template changes
    fetchDashboardData();
    // You could also show a success toast here
    alert('Template customization applied successfully!');
    // Clear the selected job
    setSelectedJobForCustomization(null);
  };

  const handleConfigureAI = (jobId?: string) => {
    setSelectedJobForCustomization(jobId || null);
    setTemplateCustomizationOpen(true);
  };

  const handleViewConfiguredJobs = () => {
    console.log('View Configured Jobs clicked'); // Debug log
    
    // Close the modal if it's open
    setTemplateCustomizationOpen(false);
    
    // Wait for modal to close, then scroll to the job configuration section
    setTimeout(() => {
      const jobConfigSection = document.getElementById('job-ai-config-section');
      if (jobConfigSection) {
        jobConfigSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // Highlight configured jobs with enhanced visual feedback
        const configuredJobs = document.querySelectorAll('[data-job-configured="true"]');
        configuredJobs.forEach((job) => {
          job.classList.add('ring-2', 'ring-green-400', 'ring-opacity-75', 'bg-green-50');
          setTimeout(() => {
            job.classList.remove('ring-2', 'ring-green-400', 'ring-opacity-75', 'bg-green-50');
          }, 3000);
        });
      }
    }, 300); // Wait for modal close animation
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      
      // Fetch jobs and stats in parallel
      const [jobsRes, statsRes] = await Promise.all([
        fetch(`${backendUrl}/api/users/my-jobs`, {
          headers: { "Authorization": `Bearer ${token}` },
        }),
        fetch(`${backendUrl}/api/users/recruiter-stats`, {
          headers: { "Authorization": `Bearer ${token}` },
        }),
      ]);

      if (!jobsRes.ok) {
        throw new Error("Failed to fetch jobs");
      }
      if (!statsRes.ok) {
        throw new Error("Failed to fetch stats");
      }

      const jobsData = await jobsRes.json();
      const statsData = await statsRes.json();

      setJobs(jobsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getJobTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "full-time":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "part-time":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "contract":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "internship":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  // Render job type using a non-breaking hyphen and prevent wrapping
  const renderJobType = (type: string) => {
    // Replace any hyphen with non-breaking hyphen and trim spaces around it
    return (type || "").replace(/\s*-\s*/g, "‑"); // U+2011
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <Card className="w-full max-w-md text-center shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Loading Dashboard...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center dark:bg-gray-900">
        <Card className="w-full max-w-md text-center shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
              Error Loading Dashboard
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboardData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Premium Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-50 via-white to-rose-50 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">Recruiter Dashboard</h1>
              <p className="text-sm text-gray-600 mt-2">Manage job postings, review candidates, and tune AI interviews.</p>
            </div>
            <Button onClick={() => router.push('/recruiter/create-job')} className="bg-black hover:bg-gray-800 text-white">
              <PlusCircle className="h-4 w-4 mr-2" /> Create New Job
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-600">Total Jobs</span><Briefcase className="h-4 w-4 text-gray-500" /></div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalJobs}</div>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-600">Applications</span><Users className="h-4 w-4 text-gray-500" /></div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalApplications}</div>
              <p className="text-xs text-gray-500">Total Received</p>
            </div>
            <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-600">Pending Reviews</span><Eye className="h-4 w-4 text-gray-500" /></div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.pendingApplications}</div>
              <p className="text-xs text-gray-500">Awaiting action</p>
            </div>
            <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-600">Interviews</span><Calendar className="h-4 w-4 text-gray-500" /></div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.scheduledInterviews}</div>
              <p className="text-xs text-gray-500">Scheduled</p>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="jobs" className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Job Management</TabsTrigger>
            <TabsTrigger value="ai-settings" className="flex items-center gap-2"><Settings className="h-4 w-4" /> AI Settings</TabsTrigger>
            <TabsTrigger value="interviews" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Interview Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card className="border border-gray-200 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Your Job Postings</CardTitle>
                <CardDescription className="text-gray-600">Manage and track your active job listings</CardDescription>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h3>
                    <p className="text-gray-600 mb-4">Start by creating your first job posting to attract candidates.</p>
                    <Button onClick={() => router.push('/recruiter/create-job')} className="bg-black hover:bg-gray-800 text-white">
                      <PlusCircle className="h-4 w-4 mr-2" /> Create Your First Job
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-600">Job Title</TableHead>
                          <TableHead className="text-gray-600">Location</TableHead>
                          <TableHead className="text-gray-600">Type</TableHead>
                          <TableHead className="text-gray-600">Applications</TableHead>
                          <TableHead className="text-gray-600">Posted</TableHead>
                          <TableHead className="text-gray-600">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map((job) => (
                          <TableRow key={job.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-gray-900">{job.title}</TableCell>
                            <TableCell className="text-gray-600"><div className="flex items-center"><MapPin className="h-3 w-3 mr-1" />{job.location}</div></TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={`${getJobTypeColor(job.type)} whitespace-nowrap`}>{renderJobType(job.type)}</Badge>
                            </TableCell>
                            <TableCell className="text-gray-600"><div className="flex items-center"><Users className="h-3 w-3 mr-1" />{job.applicantsCount ?? job._count?.applications ?? 0}</div></TableCell>
                            <TableCell className="text-gray-600">{formatDate(job.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button onClick={() => router.push(`/recruiter/jobs/${job.id}`)} size="sm" variant="outline" className="text-gray-700">
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                                <Button onClick={() => router.push(`/recruiter/jobs/${job.id}/edit`)} size="sm" variant="outline" className="text-blue-600">
                                  <Edit className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <Button onClick={() => deleteJob(job.id)} disabled={deleteLoading === job.id} size="sm" variant="outline" className="text-red-600">
                                  <Trash2 className="h-3 w-3 mr-1" /> {deleteLoading === job.id ? 'Deleting...' : 'Delete'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-settings">
            <div className="space-y-6">
              {/* Main Action Card */}
              <Card className="border border-gray-200 bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">AI Interview Configuration</CardTitle>
                      <CardDescription className="text-gray-600">Manage your AI interviewer settings and job-specific templates</CardDescription>
                    </div>
                    <Button 
                      onClick={() => handleConfigureAI()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Customize Templates
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Wand2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-blue-900">Template Wizard</h3>
                          <p className="text-sm text-blue-700">Multi-step customization</p>
                        </div>
                      </div>
                      <p className="text-sm text-blue-600 mb-3">
                        Use our advanced wizard to customize AI templates with specific contexts, questions, and scoring weights.
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => handleConfigureAI()}
                        className="bg-blue-600 hover:bg-blue-700 w-full"
                      >
                        Open Wizard
                      </Button>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-green-900">Active Configs</h3>
                          <p className="text-sm text-green-700">{jobs.filter(job => job.aiTemplateId || job.customInterviewContext || job.customQuestionsList?.length).length} jobs configured</p>
                        </div>
                      </div>
                      <p className="text-sm text-green-600 mb-3">
                        Jobs with custom AI interview configurations are actively using personalized templates.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-100 w-full"
                        onClick={handleViewConfiguredJobs}
                      >
                        View Configured Jobs
                      </Button>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-purple-900">AI Templates</h3>
                          <p className="text-sm text-purple-700">{templates.length} available</p>
                        </div>
                      </div>
                      <p className="text-sm text-purple-600 mb-3">
                        Pre-built templates for different interview focuses: technical, behavioral, and more.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-100 w-full"
                        onClick={() => handleConfigureAI()}
                      >
                        Browse Templates
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Job-Specific AI Configuration Overview */}
              <Card id="job-ai-config-section" className="border border-gray-200 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Job-Specific AI Configuration</CardTitle>
                  <CardDescription className="text-gray-600">
                    Overview of AI interview settings for each of your job postings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {jobs.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
                      <p className="text-gray-600 mb-4">Create your first job to start configuring AI interviews</p>
                      <Button onClick={() => router.push('/recruiter/create-job')}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Job
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobs.map((job) => {
                        const hasAIConfig = job.aiTemplateId || job.customInterviewContext || job.customQuestionsList?.length;
                        return (
                          <div 
                            key={job.id} 
                            className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            data-job-configured={hasAIConfig ? 'true' : 'false'}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium text-gray-900">{job.title}</h4>
                                  <Badge 
                                    variant={hasAIConfig ? "default" : "secondary"}
                                    className={hasAIConfig ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                                  >
                                    {hasAIConfig ? "AI Configured" : "Default AI"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {job.location}
                                  </span>
                                  <span>{job.type}</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {job.applicantsCount} applicants
                                  </span>
                                </div>
                                {hasAIConfig && (
                                  <div className="text-sm text-green-600">
                                    ✓ Custom AI template applied
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleConfigureAI(job.id)}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  {hasAIConfig ? "Edit AI" : "Configure AI"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="interviews">
            <RecruiterInterviewDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Customization Modal */}
      <TemplateCustomizationModal
        open={templateCustomizationOpen}
        onOpenChange={(open) => {
          console.log('Dashboard onOpenChange called with:', open); // Debug log
          setTemplateCustomizationOpen(open);
        }}
        onComplete={handleTemplateCustomizationComplete}
        preSelectedJobId={selectedJobForCustomization}
      />
    </div>
  );
}
