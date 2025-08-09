'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Users,
  Calendar,
  TrendingUp,
  Download,
  Clock,
  CheckCircle,
  Video,
  Camera,
  Search,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

interface InterviewResult {
  id: string;
  scheduledAt: string;
  actualStartedAt?: string;
  endedAt?: string;
  isActive: boolean;
  aiSummary?: string;
  strengths?: string;
  weaknesses?: string;
  overallRating?: number;
  application: {
    id: string;
    candidate: {
      user: {
        email: string;
      };
    };
    job: {
  id?: string;
      title: string;
    };
  };
  score?: {
    communicationScore: number;
    technicalScore: number;
    problemSolvingScore: number;
    culturalFitScore: number;
    totalScore: number;
  };
  recordings: Array<{
    id: string;
    videoUrl?: string;
    audioUrl?: string;
    recordingType: string;
  }>;
  screenshots: Array<{
    id: string;
    imageUrl: string;
    takenAt: string;
  }>;
  recommendation?: string;
  shouldProceed?: boolean;
}

export default function RecruiterInterviewDashboard() {
  const [interviews, setInterviews] = useState<InterviewResult[]>([]);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    pendingInterviews: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<InterviewResult | null>(null);
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'inprogress' | 'completed' | 'missed'>('all');

  useEffect(() => {
    fetchInterviewData();
  }, []);

  const fetchInterviewData = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

      // Fetch recruiter applications with interview data
      const response = await fetch(`${backendUrl}/api/users/recruiter/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch interview data');
      }

      const applications = await response.json();
      
      // Filter applications that have interviews
      const interviewData = applications
        .filter((app: any) => app.interview)
        .map((app: any) => ({
          ...app.interview,
          application: {
            id: app.id,
            candidate: app.candidate,
            job: app.job
          }
        }));

      setInterviews(interviewData);

      // Calculate stats
      const completed = interviewData.filter((i: InterviewResult) => i.endedAt).length;
      const pending = interviewData.filter((i: InterviewResult) => !i.endedAt && i.scheduledAt).length;
      const scores = interviewData
        .filter((i: InterviewResult) => i.score?.totalScore)
        .map((i: InterviewResult) => i.score!.totalScore);
      const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

      setStats({
        totalInterviews: interviewData.length,
        completedInterviews: completed,
        averageScore: avgScore,
        pendingInterviews: pending
      });
    } catch (error) {
      console.error('Error fetching interview data:', error);
      toast.error('Failed to load interview data');
    } finally {
      setLoading(false);
    }
  };

  const statusOf = (interview: InterviewResult): 'completed' | 'inprogress' | 'scheduled' | 'missed' => {
    if (interview.endedAt) return 'completed';
    if (interview.isActive) return 'inprogress';
    if (new Date(interview.scheduledAt) > new Date()) return 'scheduled';
    return 'missed';
  };

  const filteredInterviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return interviews.filter((i) => {
      const matchesQuery = !q
        || i.application.job.title.toLowerCase().includes(q)
        || i.application.candidate.user.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || statusOf(i) === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [interviews, query, statusFilter]);

  // Group by job, then by candidate
  const groupedByJob = useMemo(() => {
    const groups = new Map<string, { jobKey: string; jobTitle: string; items: InterviewResult[] }>();
    for (const int of filteredInterviews) {
      const key = int.application.job.id || int.application.job.title;
      if (!groups.has(key)) groups.set(key, { jobKey: key, jobTitle: int.application.job.title, items: [] });
      groups.get(key)!.items.push(int);
    }
    // Sort groups by job title
    return Array.from(groups.values()).sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
  }, [filteredInterviews]);

  const getStatusBadge = (interview: InterviewResult) => {
    if (interview.endedAt) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    } else if (interview.isActive) {
      return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
    } else if (new Date(interview.scheduledAt) > new Date()) {
      return <Badge className="bg-yellow-100 text-yellow-800">Scheduled</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Missed</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const downloadRecording = async (recording: any) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const rawUrl: string = recording.videoUrl || recording.audioUrl;
      const href = rawUrl?.startsWith('http') ? rawUrl : `${backendUrl}${rawUrl}`;
      const link = document.createElement('a');
      link.href = href;
      link.download = `interview-recording-${recording.id}.webm`;
      link.click();
    } catch (error) {
      toast.error('Failed to download recording');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 rounded-xl bg-gradient-to-r from-indigo-100 via-white to-rose-100 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-white/60 backdrop-blur border border-white/60" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-50 via-white to-rose-50 p-8 md:p-10 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">Interview Analytics</h1>
              <p className="mt-2 text-gray-600 max-w-2xl">Monitor performance, review media, and make confident hiring decisions.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg border border-gray-200 bg-white/70 text-gray-700 text-xs">Total: {stats.totalInterviews}</span>
                <span className="px-3 py-1 rounded-lg border border-gray-200 bg-white/70 text-gray-700 text-xs">Completed: {stats.completedInterviews}</span>
                <span className="px-3 py-1 rounded-lg border border-gray-200 bg-white/70 text-gray-700 text-xs">Avg Score: {stats.averageScore.toFixed(1)}</span>
                <span className="px-3 py-1 rounded-lg border border-gray-200 bg-white/70 text-gray-700 text-xs">Pending: {stats.pendingInterviews}</span>
              </div>
            </div>
            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by role or candidate email"
                  className="pl-10 h-10 rounded-xl border-gray-200 bg-white/70 backdrop-blur-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList className="w-full grid grid-cols-5 md:w-fit md:inline-grid">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="inprogress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="missed">Missed</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="text-sm text-muted-foreground">Showing {filteredInterviews.length} of {interviews.length} interviews</div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interview List (Grouped by Job) */}
          <div className="lg:col-span-2">
            <Card className="border border-gray-200 bg-white/70 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle>Interviews by Job</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[640px] pr-2">
                  <div className="space-y-6">
                    {groupedByJob.map((group) => (
                      <div key={group.jobTitle} className="border rounded-xl bg-white">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                          <div className="font-semibold">{group.jobTitle}</div>
                          <Badge variant="secondary">{group.items.length} candidate(s)</Badge>
                        </div>
                        <div className="divide-y">
                          {group.items
                            .sort((a, b) => a.application.candidate.user.email.localeCompare(b.application.candidate.user.email))
                            .map((interview) => (
                            <button
                              key={interview.id}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none ${selectedInterview?.id === interview.id ? 'bg-indigo-50' : ''}`}
                              onClick={() => setSelectedInterview(interview)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium">{interview.application.candidate.user.email}</div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{new Date(interview.scheduledAt).toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {getStatusBadge(interview)}
                                  {interview.score && (
                                    <span className="text-sm font-bold">{interview.score.totalScore.toFixed(1)}/10</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                          {group.items.length === 0 && (
                            <div className="px-4 py-6 text-sm text-muted-foreground">No candidates yet.</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {groupedByJob.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-10">No interviews match your filters.</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Interview Details */}
          <div>
            <Card className="border border-gray-200 bg-white/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Interview Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedInterview ? (
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="scores">Scores</TabsTrigger>
                      <TabsTrigger value="media">Media</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-2">
                      <div>
                        <h4 className="font-semibold mb-2">Candidate</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedInterview.application.candidate.user.email}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Position</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedInterview.application.job.title}
                        </p>
                      </div>

                      {selectedInterview.aiSummary && (
                        <div>
                          <h4 className="font-semibold mb-2">AI Summary</h4>
                          <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded">
                            {selectedInterview.aiSummary}
                          </p>
                        </div>
                      )}

                      {selectedInterview.strengths && (
                        <div>
                          <h4 className="font-semibold mb-2 text-green-700 dark:text-green-400">Strengths</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedInterview.strengths}
                          </p>
                        </div>
                      )}

                      {selectedInterview.weaknesses && (
                        <div>
                          <h4 className="font-semibold mb-2 text-red-700 dark:text-red-400">Areas for Improvement</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedInterview.weaknesses}
                          </p>
                        </div>
                      )}
                      {selectedInterview.recommendation && (
                        <div className="mt-4 flex items-center gap-3">
                          <span className="font-semibold">AI Recommendation:</span>
                          <span
                            className={`px-3 py-1 rounded-full text-white font-bold text-xs ${
                              selectedInterview.recommendation === 'Strong Hire' || selectedInterview.recommendation === 'Hire'
                                ? 'bg-green-600'
                                : selectedInterview.recommendation === 'No Hire' || selectedInterview.recommendation === 'Strong No Hire'
                                ? 'bg-red-600'
                                : 'bg-gray-400'
                            }`}
                          >
                            {selectedInterview.recommendation}
                          </span>
                        </div>
                      )}
                      {typeof selectedInterview.shouldProceed !== 'undefined' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-semibold">Should Proceed to Next Round:</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              selectedInterview.shouldProceed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {selectedInterview.shouldProceed ? 'Yes' : 'No'}
                          </span>
                          <span
                            className="ml-2 text-xs text-muted-foreground"
                            title="AI is strict. Only candidates with strong performance in all areas are recommended to proceed."
                          >
                            <svg
                              className="inline h-4 w-4 text-muted-foreground mr-1"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            AI is strict. Only strong candidates are recommended.
                          </span>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="scores" className="space-y-4 mt-2">
                      {selectedInterview.score ? (
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Communication</span>
                              <span>{selectedInterview.score.communicationScore}/10</span>
                            </div>
                            <Progress value={selectedInterview.score.communicationScore * 10} />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Technical Skills</span>
                              <span>{selectedInterview.score.technicalScore}/10</span>
                            </div>
                            <Progress value={selectedInterview.score.technicalScore * 10} />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Problem Solving</span>
                              <span>{selectedInterview.score.problemSolvingScore}/10</span>
                            </div>
                            <Progress value={selectedInterview.score.problemSolvingScore * 10} />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Cultural Fit</span>
                              <span>{selectedInterview.score.culturalFitScore}/10</span>
                            </div>
                            <Progress value={selectedInterview.score.culturalFitScore * 10} />
                          </div>

                          <div className="pt-2 border-t">
                            <div className="flex justify-between font-semibold">
                              <span>Overall Score</span>
                              <span className={getScoreColor(selectedInterview.score.totalScore)}>
                                {selectedInterview.score.totalScore.toFixed(1)}/10
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">No scores available yet</p>
                      )}
                    </TabsContent>

                    <TabsContent value="media" className="space-y-4 mt-2">
                      {selectedInterview.recordings.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Recordings ({selectedInterview.recordings.length})</h4>
                          <div className="space-y-2">
                            {selectedInterview.recordings.map((recording) => (
                              <div key={recording.id} className="flex items-center justify-between p-2 bg-muted/40 rounded">
                                <span className="text-sm">{recording.recordingType} Recording</span>
                                <Button size="sm" variant="outline" onClick={() => downloadRecording(recording)}>
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedInterview.screenshots.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Screenshots ({selectedInterview.screenshots.length})</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedInterview.screenshots.slice(0, 4).map((screenshot) => (
                              <div key={screenshot.id} className="relative">
                                <img
                                  src={
                                    screenshot.imageUrl?.startsWith('http')
                                      ? screenshot.imageUrl
                                      : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}${screenshot.imageUrl}`
                                  }
                                  alt="Screenshot"
                                  className="w-full h-20 object-cover rounded"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                                  {new Date(screenshot.takenAt).toLocaleTimeString()}
                                </div>
                              </div>
                            ))}
                          </div>
                          {selectedInterview.screenshots.length > 4 && (
                            <p className="text-sm text-muted-foreground text-center mt-2">
                              +{selectedInterview.screenshots.length - 4} more screenshots
                            </p>
                          )}
                        </div>
                      )}

                      {selectedInterview.recordings.length === 0 && selectedInterview.screenshots.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">No media files available</p>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Select an interview to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
