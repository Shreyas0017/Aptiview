'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

interface InterviewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: {
    id: string;
    job: {
      title: string;
      interviewEndDate?: string;
    };
  };
  onScheduled: (interviewLink: string) => void;
}

export default function InterviewScheduleModal({
  isOpen,
  onClose,
  application,
  onScheduled
}: InterviewScheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const { getToken } = useAuth();

  const handleScheduleInterview = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

    // Check if date is before end date
    if (application.job.interviewEndDate) {
      const endDate = new Date(application.job.interviewEndDate);
      if (scheduledDateTime > endDate) {
        toast.error('Interview must be scheduled before the deadline');
        return;
      }
    }

    setIsScheduling(true);

    try {
      const token = await getToken();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

      const response = await fetch(`${backendUrl}/api/interviews/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: application.id,
          scheduledAt: scheduledDateTime.toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule interview');
      }

      const result = await response.json();
      toast.success('Interview scheduled successfully! Check your email for the interview link.');
      onScheduled(result.interviewLink);
      onClose();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule interview');
    } finally {
      setIsScheduling(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (date < today) return true;
    
    // Disable dates after interview end date
    if (application.job.interviewEndDate) {
      const endDate = new Date(application.job.interviewEndDate);
      if (date > endDate) return true;
    }
    
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule Your AI Interview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            <p>You're scheduling an interview for: <strong>{application.job.title}</strong></p>
            {application.job.interviewEndDate && (
              <p className="text-amber-600 mt-1">
                ⚠️ Interview must be scheduled before: {new Date(application.job.interviewEndDate).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-base font-medium mb-3 block">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-md border"
              />
            </div>

            <div>
              <Label htmlFor="time" className="text-base font-medium mb-3 block">
                Select Time
              </Label>
              <select
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a time</option>
                {generateTimeSlots().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Interview Information:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• This will be an AI-powered interview</li>
              <li>• You'll need camera and microphone access</li>
              <li>• The interview link will be sent to your email</li>
              <li>• The link will only be active at your scheduled time</li>
              <li>• Screenshots will be taken during the interview</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isScheduling}>
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleInterview} 
              disabled={!selectedDate || !selectedTime || isScheduling}
            >
              {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
