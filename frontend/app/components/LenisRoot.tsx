"use client"

import React from "react"
import { ReactLenis } from "lenis/react"

/**
 * LenisRoot mounts a single Lenis instance app-wide.
 * - root: uses <html> scroll for App Router
 * - anchors: enables smooth #anchor scrolling with header offset
 * - autoRaf: lets Lenis drive its own raf loop
 */
export default function LenisRoot({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReactLenis root options={{ anchors: { offset: 80 }, autoRaf: true }} />
      {children}
    </>
  )
}
