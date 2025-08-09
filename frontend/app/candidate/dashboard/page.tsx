"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Clock, CheckCircle, Search, ArrowRight, MapPin, Building2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CandidateDashboardPage() {
  // Auth & routing hooks
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Local state hooks
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [myInterviews, setMyInterviews] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState<"ALL" | "PENDING" | "INTERVIEW" | "COMPLETED" | "REJECTED">("ALL");
  const [appSort, setAppSort] = useState<"recent" | "oldest" | "status" | "title" | "company">("recent");
  const [jobSort, setJobSort] = useState<"relevance" | "title" | "company" | "location">("relevance");

  // Effects
  useEffect(() => {
    if (!isLoaded || !user) return;
    const checkRole = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${backendUrl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const dbUser = await res.json();
      if (dbUser.role !== "CANDIDATE") {
        router.replace(dbUser.role === "RECRUITER" ? "/dashboard" : "/role-selection");
      }
    };
    checkRole();
  }, [user, isLoaded, getToken, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const [appsRes, jobsRes, interviewsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/applications`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/jobs`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/my-interviews`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
        ]);
        if (!appsRes.ok || !jobsRes.ok) throw new Error("Failed to fetch data");
        const [apps, jobs, interviews] = await Promise.all([
          appsRes.json(),
          jobsRes.json(),
          interviewsRes.ok ? interviewsRes.json() : [],
        ]);
        setMyApplications(apps);
        setAvailableJobs(jobs);
        setMyInterviews(interviews);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getToken]);

  // Derived data (ALWAYS before any early returns to keep hooks order stable)
  const mappedApplications = myApplications.map((app) => {
    const interview = myInterviews.find((iv) => iv.application.id === app.id);
    return {
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job?.title || "",
      company: app.job?.recruiter?.company || "",
      status: app.status?.replace(/_/g, " ") || "",
      date: app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "",
      appliedAt: app.createdAt ? new Date(app.createdAt).getTime() : 0,
      location: app.job?.location || "",
      type: app.job?.type || "",
      interview: interview
        ? {
            id: interview.id,
            uniqueLink: interview.uniqueLink,
            scheduledAt: interview.scheduledAt,
            isCompleted: !!interview.endedAt,
            canJoin:
              !interview.endedAt &&
              new Date(interview.scheduledAt) <= new Date(Date.now() + 60 * 60 * 1000),
          }
        : null,
    };
  });
  const appliedJobIds = new Set(mappedApplications.map((a) => a.jobId));
  const mappedJobs = availableJobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.recruiter?.company || "",
    location: job.location || "",
    type: job.type || "",
    alreadyApplied: appliedJobIds.has(job.id),
  }));

  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = mappedApplications;
    if (appFilter !== "ALL") {
      if (appFilter === "PENDING") list = list.filter((a) => a.status.includes("PENDING"));
      if (appFilter === "INTERVIEW") list = list.filter((a) => a.status.includes("INTERVIEW"));
      if (appFilter === "COMPLETED") list = list.filter((a) => a.interview?.isCompleted);
      if (appFilter === "REJECTED") list = list.filter((a) => a.status.includes("REJECTED"));
    }
    if (!q) return list;
    return list.filter(
      (a) =>
        a.jobTitle.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [mappedApplications, appFilter, query]);

  const sortedApplications = useMemo(() => {
    const arr = [...filteredApplications]
    switch (appSort) {
      case "oldest":
        return arr.sort((a, b) => a.appliedAt - b.appliedAt)
      case "status":
        return arr.sort((a, b) => a.status.localeCompare(b.status))
      case "title":
        return arr.sort((a, b) => a.jobTitle.localeCompare(b.jobTitle))
      case "company":
        return arr.sort((a, b) => a.company.localeCompare(b.company))
      case "recent":
      default:
        return arr.sort((a, b) => b.appliedAt - a.appliedAt)
    }
  }, [filteredApplications, appSort])

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mappedJobs;
    return mappedJobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.type.toLowerCase().includes(q)
    );
  }, [mappedJobs, query]);

  const sortedJobs = useMemo(() => {
    const arr = [...filteredJobs]
    switch (jobSort) {
      case "title":
        return arr.sort((a, b) => a.title.localeCompare(b.title))
      case "company":
        return arr.sort((a, b) => a.company.localeCompare(b.company))
      case "location":
        return arr.sort((a, b) => a.location.localeCompare(b.location))
      case "relevance":
      default:
        return arr
    }
  }, [filteredJobs, jobSort])

  const upcomingInterviews = myInterviews.filter((i: any) => !i.endedAt).length;

  // Helpers
  const renderJobType = (type: string) => (type ? type.replace(/-/g, "\u2011") : "");

  // Early returns AFTER derived hooks to keep order stable
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-56 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Premium Hero */}
        <div className="relative overflow-hidden rounded-2xl mb-8 border border-gray-200 bg-gradient-to-br from-indigo-50 via-white to-rose-50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
          <div className="relative p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">Welcome back{user?.firstName ? `, ${user.firstName}` : ""}</h1>
                <p className="text-sm text-gray-600 mt-2">Manage applications, interviews, and discover roles tailored to you.</p>
              </div>
              <div className="relative w-full lg:w-[360px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search jobs or applications"
                  className="pl-9 h-10 rounded-xl border-gray-200 bg-white/70 backdrop-blur-md"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Total Applications</span>
                  <FileText className="h-4 w-4 text-gray-500" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{myApplications.length}</div>
                <p className="text-xs text-gray-500">Submitted</p>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Interviews</span>
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{upcomingInterviews}</div>
                <p className="text-xs text-gray-500">Upcoming</p>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Open Roles</span>
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{availableJobs.length}</div>
                <p className="text-xs text-gray-500">Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Applications */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <CardTitle className="text-xl font-semibold text-gray-900">My Applications</CardTitle>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:items-center">
                {/* Mobile: compact select for filter to avoid overlap */}
                <Select value={appFilter} onValueChange={(v) => setAppFilter(v as any)}>
                  <SelectTrigger className="sm:hidden w-full" aria-label="Filter applications">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="sm:hidden">
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="INTERVIEW">Interview</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {/* Desktop/Tablet: tabbed filters with wrapping */}
                <Tabs value={appFilter} defaultValue="ALL" onValueChange={(v) => setAppFilter(v as any)} className="hidden sm:block w-full sm:w-auto">
                  <TabsList className="flex flex-wrap items-center gap-1 w-full overflow-x-auto">
                    <TabsTrigger className="whitespace-nowrap" value="ALL">All</TabsTrigger>
                    <TabsTrigger className="whitespace-nowrap" value="PENDING">Pending</TabsTrigger>
                    <TabsTrigger className="whitespace-nowrap" value="INTERVIEW">Interview</TabsTrigger>
                    <TabsTrigger className="whitespace-nowrap" value="COMPLETED">Completed</TabsTrigger>
                    <TabsTrigger className="whitespace-nowrap" value="REJECTED">Rejected</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Select value={appSort} onValueChange={(v) => setAppSort(v as any)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="title">Job Title</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {sortedApplications.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                  No applications match your filters.
                </div>
              ) : (
                <>
                  {/* Desktop/tablet: table view */}
                  <div className="hidden md:block">
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[48%]">Job</TableHead>
                          <TableHead className="w-[16%]">Status</TableHead>
                          <TableHead className="w-[20%]">Interview</TableHead>
                          <TableHead className="w-[16%] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedApplications.map((app) => (
                          <TableRow key={app.id} className="hover:bg-gray-50">
                            <TableCell className="align-top py-3.5">
                              <div className="font-medium text-gray-900 truncate max-w-[420px]" title={app.jobTitle}>{app.jobTitle}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                                {app.company && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200"><Building2 className="h-3 w-3" /> {app.company}</span>
                                )}
                                {app.location && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200"><MapPin className="h-3 w-3" /> {app.location}</span>
                                )}
                                {app.type && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 whitespace-nowrap">{renderJobType(app.type)}</span>
                                )}
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-500">Applied: {app.date}</span>
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3.5 pr-4 md:pr-6">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "capitalize text-xs px-2 py-0.5",
                                  app.status === "Interview Scheduled"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                )}
                              >
                                {app.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-700 align-top py-3.5 pl-4 md:pl-6">
                              {app.interview ? (
                                app.interview.isCompleted ? (
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">Completed</Badge>
                                ) : app.interview.canJoin ? (
                                  <Link href={`/interview/${app.interview.uniqueLink}`}>
                                    <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700">Join</Button>
                                  </Link>
                                ) : (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5">Scheduled</Badge>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top py-3.5">
                              <Button variant="ghost" size="sm" className="h-8 text-xs">View</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: card list */}
                  <div className="md:hidden grid grid-cols-1 gap-3">
                    {sortedApplications.map((app) => (
                      <div key={app.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{app.jobTitle}</div>
                            <div className="text-xs text-gray-600 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {app.company || "—"}</div>
                          </div>
                          <Badge variant="outline" className="capitalize">{app.status}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                          <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200">Applied: {app.date}</span>
                          {app.location && <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-1"><MapPin className="h-3 w-3" /> {app.location}</span>}
                          {app.type && <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200">{app.type}</span>}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[11px] text-gray-600">
                            {app.interview ? (
                              app.interview.isCompleted ? "Interview completed" : app.interview.canJoin ? "Can join soon" : "Interview scheduled"
                            ) : (
                              "No interview"
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            {app.interview && app.interview.canJoin && !app.interview.isCompleted ? (
                              <Link href={`/interview/${app.interview.uniqueLink}`}>
                                <Button size="sm" className="h-8 text-xs">Join</Button>
                              </Link>
                            ) : null}
                            <Button variant="ghost" size="sm" className="h-8 text-xs">View</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Jobs */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <CardTitle className="text-xl font-semibold text-gray-900">Available Jobs</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link href="/candidate/jobs">
                  <Button size="sm" variant="default" className="w-full sm:w-auto">
                    Browse All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <Select value={jobSort} onValueChange={(v) => setJobSort(v as any)}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {sortedJobs.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                  No jobs found. Try adjusting your search.
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[64%]">Role</TableHead>
                          <TableHead className="w-[16%]">Status</TableHead>
                          <TableHead className="w-[20%] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedJobs.slice(0, 8).map((job) => (
                          <TableRow key={job.id} className="hover:bg-gray-50">
                            <TableCell className="align-top py-3.5">
                              <div className="font-medium text-gray-900 truncate max-w-[520px]" title={job.title}>{job.title}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                                {job.company && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200"><Building2 className="h-3 w-3" /> {job.company}</span>
                                )}
                                {job.location && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200"><MapPin className="h-3 w-3" /> {job.location}</span>
                                )}
                                {job.type && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 whitespace-nowrap">{renderJobType(job.type)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3.5">
                              {job.alreadyApplied ? (
                                <Badge variant="outline" className="text-xs px-2 py-0.5">Applied</Badge>
                              ) : (
                                <span className="text-xs text-gray-400">Not applied</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top py-3.5">
                              {job.alreadyApplied ? (
                                <Button disabled className="h-8 text-xs bg-gray-300 cursor-not-allowed">Applied</Button>
                              ) : (
                                <Link href={`/candidate/apply?jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}`}>
                                  <Button className="h-8 text-xs">Apply</Button>
                                </Link>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden grid grid-cols-1 gap-3">
                    {sortedJobs.slice(0, 8).map((job) => (
                      <div key={job.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{job.title}</div>
                            <div className="text-xs text-gray-600 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {job.company || "—"}</div>
                          </div>
                          {job.alreadyApplied ? (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">Applied</Badge>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-gray-600">
                          {job.location && <span className="px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>}
                          {job.type && <span className="px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 whitespace-nowrap">{renderJobType(job.type)}</span>}
                        </div>
                        <div className="mt-3 flex justify-end">
                          {job.alreadyApplied ? (
                            <Button disabled className="h-8 text-xs bg-gray-300 cursor-not-allowed">Applied</Button>
                          ) : (
                            <Link href={`/candidate/apply?jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}`}>
                              <Button className="h-8 text-xs">Apply</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">Interview Preparation Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex flex-col items-center justify-center text-gray-600 bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4 text-center">
              <Briefcase className="h-14 w-14 text-gray-300 mb-3" />
              <span className="text-base font-medium">Resources to help you prepare will appear here.</span>
              <p className="text-xs text-gray-400 mt-1">Guides and practice questions coming soon.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
