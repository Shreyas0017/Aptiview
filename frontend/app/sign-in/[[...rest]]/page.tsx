"use client";

import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";

function DynamicDashboardRedirect() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoaded || !user) return;
    // Set a one-time flag after sign-in
    if (typeof window !== "undefined") {
      localStorage.setItem("justSignedIn", "true");
    }
  }, [isLoaded, user]);
  return null;
}

export default function SignInPage() {
  return <>
    <SignIn />
    <DynamicDashboardRedirect />
  </>;
}
