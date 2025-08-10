"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TemplateCustomizationWizard from "./TemplateCustomizationWizard"

interface TemplateCustomizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
  preSelectedJobId?: string | null
}

export default function TemplateCustomizationModal({
  open,
  onOpenChange,
  onComplete,
  preSelectedJobId
}: TemplateCustomizationModalProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (open) {
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scrolling when modal closes
        document.body.style.overflow = 'unset';
      };
    }
  }, [open]);

  const handleComplete = () => {
    onComplete?.()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('Dialog onOpenChange called with:', newOpen); // Debug log
      onOpenChange(newOpen);
    }}>
      <DialogContent 
        className="max-w-none w-[95vw] max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden"
        onOpenAutoFocus={(e) => {
          console.log('Dialog onOpenAutoFocus called'); // Debug log
          e.preventDefault();
        }}
      >
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Customize AI Interview Template</DialogTitle>
            <DialogDescription>
              Set up a customized AI interview template for your job postings
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Main content with internal scrolling */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
          onWheel={(e) => {
            // Prevent wheel events from bubbling to parent
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent touch scroll events from bubbling to parent
            e.stopPropagation();
          }}
        >
          <TemplateCustomizationWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
            showCloseButton={false}
            preSelectedJobId={preSelectedJobId}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
