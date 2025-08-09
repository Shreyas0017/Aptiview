"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export function GlobalUserProvisioner() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn || !user) return;
    let cancelled = false;
    async function provision() {
      try {
        const token = await getToken();
        if (!token) {
          console.log("No token available");
          return;
        }
        const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
        const body = { email };
        const res = await fetch(`${backendUrl}/api/users/provision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errText = await res.text();
          if (!cancelled) console.error("Provisioning failed:", errText);
        }
      } catch (err) {
        if (!cancelled) console.error("Provisioning error:", err);
      }
      return () => { cancelled = true; };
    }
    provision();
  }, [isSignedIn, user, getToken]);
  return null;
} 