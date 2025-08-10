"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronRight } from "lucide-react"

interface StepperProps {
  steps: string[]
  currentStep: number
  className?: string
}

interface StepperStepProps {
  step: string
  index: number
  currentStep: number
  isLast: boolean
}

const StepperStep = React.forwardRef<HTMLDivElement, StepperStepProps>(
  ({ step, index, currentStep, isLast }, ref) => {
    const isCompleted = index < currentStep
    const isCurrent = index === currentStep
    const isPending = index > currentStep

    return (
      <div ref={ref} className="flex items-center">
        <div className="flex items-center">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
              {
                "border-primary bg-primary text-primary-foreground": isCompleted,
                "border-primary bg-background text-primary": isCurrent,
                "border-muted-foreground/30 bg-background text-muted-foreground": isPending,
              }
            )}
          >
            {isCompleted ? (
              <Check className="h-4 w-4" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
          <div className="ml-2 flex flex-col">
            <span
              className={cn("text-sm font-medium", {
                "text-primary": isCurrent,
                "text-foreground": isCompleted,
                "text-muted-foreground": isPending,
              })}
            >
              {step}
            </span>
          </div>
        </div>
        {!isLast && (
          <ChevronRight
            className={cn("mx-2 h-4 w-4", {
              "text-primary": isCompleted,
              "text-muted-foreground/50": !isCompleted,
            })}
          />
        )}
      </div>
    )
  }
)
StepperStep.displayName = "StepperStep"

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ steps, currentStep, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between w-full", className)}
        {...props}
      >
        {steps.map((step, index) => (
          <StepperStep
            key={step}
            step={step}
            index={index}
            currentStep={currentStep}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    )
  }
)
Stepper.displayName = "Stepper"

export { Stepper, StepperStep }
