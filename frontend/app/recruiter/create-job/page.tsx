"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function CreateJobPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    type: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const { getToken } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${backendUrl}/api/users/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create job");
      }

      setIsSubmitted(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      console.error("Job creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-3xl font-bold text-gray-900">Job Posted!</CardTitle>
            <CardDescription className="text-gray-600">
              Your job posting has been created successfully. Candidates can now apply!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Job Posting</h1>
          <p className="text-gray-600 mt-2">Fill in the details to post a new job opening.</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">Job Details</CardTitle>
            <CardDescription className="text-gray-600">
              Provide comprehensive job information to attract the right candidates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-gray-700">
                  Job Title *
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Senior Software Engineer"
                  className="border-gray-300 focus-visible:ring-gray-400"
                />
              </div>

              <div>
                <Label htmlFor="location" className="text-gray-700">
                  Location *
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="e.g., San Francisco, CA or Remote"
                  className="border-gray-300 focus-visible:ring-gray-400"
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-gray-700">
                  Job Type *
                </Label>
                <Select value={formData.type} onValueChange={handleSelectChange} required>
                  <SelectTrigger className="border-gray-300 focus-visible:ring-gray-400">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description" className="text-gray-700">
                  Job Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Describe the role, responsibilities, requirements, and benefits..."
                  className="border-gray-300 focus-visible:ring-gray-400 min-h-[200px]"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use markdown formatting for better presentation. Include job responsibilities, requirements, and benefits.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black hover:bg-gray-800"
                >
                  {loading ? "Creating..." : "Create Job Posting"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
