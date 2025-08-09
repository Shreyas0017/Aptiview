"use client"

import { motion } from "motion/react"
import { type RefObject, useEffect, useId, useMemo, useState } from "react"

import { cn } from "@/lib/utils"

export interface AnimatedBeamProps {
  className?: string
  containerRef: RefObject<HTMLElement | null> // Container ref
  fromRef: RefObject<HTMLElement | null>
  toRef: RefObject<HTMLElement | null>
  curvature?: number
  reverse?: boolean
  pathColor?: string
  pathWidth?: number
  pathOpacity?: number
  gradientStartColor?: string
  gradientStopColor?: string
  delay?: number
  duration?: number
  startXOffset?: number
  startYOffset?: number
  endXOffset?: number
  endYOffset?: number
  /** Disable gradient animation and motion for users preferring reduced motion */
  animated?: boolean
  /** Draw a soft glow under the colored beam */
  glow?: boolean
  /** Animate dash offset to simulate flow */
  dashed?: boolean
  /** Custom line cap */
  lineCap?: "round" | "butt" | "square"
  /** Visual theme presets for gradient + styling */
  theme?: "custom" | "neon" | "plasma" | "sunset" | "ocean" | "mono"
  /** Overall visual strength (affects glow/opacity). 0..1 */
  intensity?: number
  /** Blend mode for colored beam */
  blendMode?: "normal" | "screen" | "overlay" | "multiply" | "color-dodge" | "lighten"
  /** Add small moving dots along the path */
  particles?: boolean
  /** Particle sizing multiplier (relative to pathWidth) */
  particleSize?: number
  /** Particle spacing multiplier */
  particleGap?: number
  /** Subtle pulsing for the colored beam */
  pulse?: boolean
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false, // Include the reverse prop
  duration = Math.random() * 3 + 4,
  delay = 0,
  pathColor = "gray",
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = "#ffaa40",
  gradientStopColor = "#9c40ff",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  animated = true,
  glow = true,
  dashed = false,
  lineCap = "round",
  theme = "custom",
  intensity = 0.9,
  blendMode = "screen",
  particles = false,
  particleSize = 1,
  particleGap = 8,
  pulse = false,
}) => {
  const id = useId()
  const [pathD, setPathD] = useState("")
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 })
  const [prefersReduced, setPrefersReduced] = useState(false)

  // Calculate the gradient coordinates based on the reverse prop
  const gradientCoordinates = reverse
    ? {
        x1: ["90%", "-10%"],
        x2: ["100%", "0%"],
        y1: ["0%", "0%"],
        y2: ["0%", "0%"],
      }
    : {
        x1: ["10%", "110%"],
        x2: ["0%", "100%"],
        y1: ["0%", "0%"],
        y2: ["0%", "0%"],
      }

  useEffect(() => {
    // Detect reduced motion
    if (typeof window !== "undefined" && "matchMedia" in window) {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
      const set = () => setPrefersReduced(mql.matches)
      set()
      mql.addEventListener?.("change", set)
      return () => mql.removeEventListener?.("change", set)
    }
  }, [])

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const rectA = fromRef.current.getBoundingClientRect()
        const rectB = toRef.current.getBoundingClientRect()

        const svgWidth = containerRect.width
        const svgHeight = containerRect.height
        setSvgDimensions({ width: svgWidth, height: svgHeight })

        const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset
        const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset
        const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset
        const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset

        // Improved curvature: offset control point along the normal of the line
        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2
        const dx = endX - startX
        const dy = endY - startY
        const len = Math.hypot(dx, dy) || 1
        // normal vector (left-hand)
        const nx = -dy / len
        const ny = dx / len
        const controlX = midX + nx * curvature
        const controlY = midY + ny * curvature

        const d = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`
        setPathD(d)
      }
    }

    // Initialize ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      updatePath()
    })

    // Observe the container element
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // Call the updatePath initially to set the initial path
    updatePath()

    // Also listen to scroll to handle layout shifts beyond size changes
    const onScroll = () => updatePath()
    window.addEventListener("scroll", onScroll, { passive: true })

    // Clean up the observer on component unmount
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("scroll", onScroll)
    }
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset])

  const dashProps = useMemo(() => {
    if (!dashed) return {}
    const length = 12 * pathWidth
    return { strokeDasharray: `${length} ${length}`, pathLength: 1 }
  }, [dashed, pathWidth])

  // Theme presets (only applied if theme !== 'custom' and colors not explicitly overridden by caller)
  const { startColor, stopColor } = useMemo(() => {
    if (theme === "custom") {
      return { startColor: gradientStartColor, stopColor: gradientStopColor }
    }
    const presets: Record<NonNullable<AnimatedBeamProps["theme"]>, { a: string; b: string }> = {
      custom: { a: gradientStartColor, b: gradientStopColor },
      neon: { a: "#7CFF6B", b: "#00E0FF" }, // lime → cyan
      plasma: { a: "#B26BFF", b: "#FF3CAC" }, // purple → hot pink
      sunset: { a: "#FF9966", b: "#FF5E62" }, // orange → coral
      ocean: { a: "#00C6FF", b: "#0072FF" }, // teal → deep blue
      mono: { a: "#A1A1AA", b: "#52525B" }, // zinc tones
    }
    return { startColor: presets[theme].a, stopColor: presets[theme].b }
  }, [theme, gradientStartColor, gradientStopColor])

  // If a preset theme is chosen, always use preset colors; if 'custom', use provided gradient colors
  const effectiveStart = startColor
  const effectiveStop = stopColor

  // Derived visuals based on intensity (clamp 0..1)
  const clampedIntensity = Math.max(0, Math.min(1, intensity))
  const baseOpacity = Math.max(0, Math.min(1, pathOpacity))
  const glowOpacity = 0.1 + clampedIntensity * 0.15
  const glowWidthFactor = 1.4 + clampedIntensity * 0.6

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute left-0 top-0 transform-gpu stroke-2", className)}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Base subtle path */}
      <path d={pathD} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={baseOpacity} strokeLinecap={lineCap} />
      {/* Optional glow */}
      {glow ? (
        <path
          d={pathD}
          stroke={effectiveStart}
          strokeWidth={pathWidth * glowWidthFactor}
          strokeOpacity={glowOpacity}
          strokeLinecap={lineCap}
          filter={`url(#glow-${id})`}
        />
      ) : null}
      {/* Colored animated/dashed path */}
      {animated && !prefersReduced ? (
        <motion.path
          d={pathD}
          strokeWidth={pathWidth}
          stroke={`url(#${id})`}
          strokeOpacity={1}
          strokeLinecap={lineCap}
          style={{ mixBlendMode: blendMode as any }}
          animate={{
            ...(dashed ? { pathLength: [0.2, 1], pathOffset: [1, 0] } : {}),
            ...(pulse ? { opacity: [0.85, 1, 0.85] } : {}),
          }}
          transition={{
            duration,
            repeat: Number.POSITIVE_INFINITY,
            ease: dashed ? "linear" : [0.16, 1, 0.3, 1],
            delay,
          }}
          {...dashProps}
        />
      ) : (
        <path d={pathD} strokeWidth={pathWidth} stroke={`url(#${id})`} strokeOpacity={1} strokeLinecap={lineCap} style={{ mixBlendMode: blendMode as any }} />
      )}

      {/* Optional particles - dotted path moving along the beam */}
      {particles && animated && !prefersReduced ? (
        <motion.path
          d={pathD}
          strokeWidth={pathWidth * (0.8 * particleSize)}
          stroke={effectiveStop}
          strokeOpacity={0.9}
          strokeLinecap="round"
          style={{ mixBlendMode: blendMode as any }}
          strokeDasharray={`${Math.max(1, pathWidth * particleSize)} ${Math.max(4, pathWidth * particleGap)}`}
          animate={{ strokeDashoffset: [0, -(
            Math.max(1, pathWidth * particleSize) + Math.max(4, pathWidth * particleGap)
          )] }}
          transition={{ duration: Math.max(1.2, duration * 0.75), repeat: Number.POSITIVE_INFINITY, ease: "linear", delay: delay * 1.1 }}
        />
      ) : null}
      <defs>
        {glow ? (
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2 + clampedIntensity * 3} result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits={"userSpaceOnUse"}
          initial={{
            x1: "0%",
            x2: "0%",
            y1: "0%",
            y2: "0%",
          }}
          animate={animated && !prefersReduced ? {
            x1: gradientCoordinates.x1,
            x2: gradientCoordinates.x2,
            y1: gradientCoordinates.y1,
            y2: gradientCoordinates.y2,
          } : undefined}
          transition={animated && !prefersReduced ? {
            delay,
            duration,
            ease: [0.16, 1, 0.3, 1], // https://easings.net/#easeOutExpo
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0,
          } : undefined}
        >
          <stop stopColor={effectiveStart} stopOpacity="0"></stop>
          <stop stopColor={effectiveStart}></stop>
          <stop offset="32.5%" stopColor={effectiveStop}></stop>
          <stop offset="100%" stopColor={effectiveStop} stopOpacity="0"></stop>
        </motion.linearGradient>
      </defs>
    </svg>
  )
}
