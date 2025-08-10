"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

// List of protected pages that require onboarding
const protectedPrefixes = [
  "/dashboard",
  "/candidate/dashboard",
  "/role-selection",
  "/candidate-profile-setup",
  "/recruiter-profile-setup",
];

function isProtectedPath(pathname: string | null | undefined) {
  return protectedPrefixes.some((prefix) => pathname?.startsWith(prefix));
}

export function RoleRedirector() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;
    async function checkProfile() {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`${backendUrl}/api/users/me`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) return;
        const dbUser = await res.json();
        const role = dbUser.role;
        const hasCandidateProfile = !!dbUser.candidateProfile;
        const hasRecruiterProfile = !!dbUser.recruiterProfile;
        const isOnRoleOrProfilePage =
          pathname?.startsWith("/role-selection") ||
          pathname?.startsWith("/candidate-profile-setup") ||
          pathname?.startsWith("/recruiter-profile-setup");
        // One-time dashboard redirect after sign-in or onboarding
        if (typeof window !== "undefined" && localStorage.getItem("justSignedIn") === "true") {
          if (role === "CANDIDATE" && hasCandidateProfile) {
            localStorage.removeItem("justSignedIn");
            if (pathname !== "/candidate/dashboard") {
              router.replace("/candidate/dashboard");
            }
            return;
          }
          if (role === "RECRUITER" && hasRecruiterProfile) {
            localStorage.removeItem("justSignedIn");
            if (pathname !== "/dashboard") {
              router.replace("/dashboard");
            }
            return;
          }
        }
        // Only run onboarding redirect logic if on a protected page
        if (!isProtectedPath(pathname)) return;
        // If no role, redirect to role selection
        if (!role && !isOnRoleOrProfilePage) {
          router.replace("/role-selection");
          return;
        }
        // If candidate, but no candidate profile, redirect to profile setup
        if (role === "CANDIDATE" && !hasCandidateProfile && !isOnRoleOrProfilePage) {
          router.replace("/candidate-profile-setup");
          return;
        }
        // If recruiter, but no recruiter profile, redirect to profile setup
        if (role === "RECRUITER" && !hasRecruiterProfile && !isOnRoleOrProfilePage) {
          router.replace("/recruiter-profile-setup");
          return;
        }
        // Otherwise, do nothing (let them access dashboard or protected page)
      } catch (err) {
        if (!cancelled) console.error("Profile check error:", err);
      }
    }
    checkProfile();
    return () => { cancelled = true; };
  }, [user, isLoaded, router, pathname, getToken]);
  return null;
} 