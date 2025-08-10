import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireClerkAuth, ClerkAuthRequest } from '../middleware/requireClerkAuth';
import { v4 as uuidv4 } from 'uuid';
import { AIInterviewer } from '../services/aiInterviewer';
import { getResumeSummary } from '../services/resumeService';
import { VoiceInterviewer } from '../services/voiceInterviewer';
import { saveBase64Screenshot } from '../services/fileService';
import { uploadBuffer } from '../services/imageKitService';
import WebSocket from 'ws';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to create AI interviewer instance
const createAIInterviewer = (job: any, application?: any, resumeSummary?: string) => {
  return new AIInterviewer({
    jobTitle: job.title,
    jobDescription: job.description,
    // Enhanced template configuration fields
    aiTemplateId: job.aiTemplateId || undefined,
    customInterviewContext: job.customInterviewContext || job.interviewContext || undefined,
    customQuestions: job.customQuestionsList || (job.customQuestions ? [job.customQuestions] : undefined),
    scoringWeights: job.scoringWeights ? JSON.parse(job.scoringWeights) : undefined,
    interviewDuration: job.interviewDuration || undefined,
    difficultyLevel: job.difficultyLevel || undefined,
    // Candidate information
    candidateResumeUrl: application?.resumeUrl,
    candidateCoverLetter: application?.coverLetter,
    resumeSummary,
  });
};

// Helper function to save recording (placeholder)
const saveRecording = async (recordingData: any, uniqueLink: string): Promise<string> => {
  // recordingData is expected as base64 string (webm)
  const base64 = typeof recordingData === 'string' ? recordingData.replace(/^data:[^;]+;base64,/, '') : '';
  const buffer = Buffer.from(base64, 'base64');
  const res = await uploadBuffer({
    buffer,
    fileName: `${uniqueLink}_${Date.now()}.webm`,
    folder: '/aptiview/recordings',
    mimeType: 'video/webm'
  });
  return res.url;
};

// Schedule an interview (after job application)
router.post('/schedule', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const { applicationId, scheduledAt } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the application belongs to the current user (candidate)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { candidateProfile: true }
    });

    if (!user || user.role !== 'CANDIDATE' || !user.candidateProfile) {
      return res.status(403).json({ error: 'Access denied. Candidate profile required.' });
    }

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id
      },
      include: {
        job: {
          include: {
            recruiter: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if scheduled time is before job interview end date
    if (application.job.interviewEndDate && new Date(scheduledAt) > application.job.interviewEndDate) {
      return res.status(400).json({ error: 'Interview must be scheduled before the deadline' });
    }

    // Generate unique interview link
    const uniqueLink = uuidv4();

    // Create interview record
    const now = new Date();
  const interview = await prisma.interview.create({
      data: {
        applicationId,
        scheduledAt: now, // Always use server time
        uniqueLink,
        isActive: false
      }
    });

    // Update application status
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'INTERVIEW_SCHEDULED' }
    });

    // Email sending omitted in development (no SMTP credentials)

    res.status(201).json({
      interview,
      interviewLink: `${process.env.FRONTEND_URL}/interview/${uniqueLink}`
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interview details by unique link
router.get('/:uniqueLink', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;

    const interview = await prisma.interview.findUnique({
      where: { uniqueLink },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: {
                  select: {
                    email: true
                  }
                }
              }
            },
            job: {
              include: {
                recruiter: {
                  include: {
                    user: {
                      select: {
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check if interview has expired (24 hours after scheduled time)
    const now = new Date();
    const scheduledTime = new Date(interview.scheduledAt);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const timeSinceScheduled = now.getTime() - scheduledTime.getTime();

    // Interview is expired if it's more than 24 hours past scheduled time AND not completed
    if (timeSinceScheduled > twentyFourHours && !interview.endedAt) {
      return res.status(403).json({ error: 'Interview link has expired' });
    }

    // Interview is accessible if:
    // 1. It's within 1 hour before scheduled time, OR
    // 2. It's after scheduled time and not expired, OR  
    // 3. It's already active
    const oneHourBefore = 60 * 60 * 1000;
    const timeUntilScheduled = scheduledTime.getTime() - now.getTime();
    
    if (timeUntilScheduled > oneHourBefore && !interview.isActive) {
      return res.status(403).json({ 
        error: 'Interview is not yet available. Please join within 1 hour of your scheduled time.',
        scheduledAt: interview.scheduledAt 
      });
    }

    res.json(interview);
  } catch (error) {
    console.error('Error fetching interview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start interview (activate the link)
router.post('/:uniqueLink/start', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;

    const interview = await prisma.interview.findUnique({
      where: { uniqueLink },
      include: {
        application: {
          include: {
            job: true
          }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check if interview time is reasonable (not more than 1 hour early)
    const now = new Date();
    const scheduledTime = new Date(interview.scheduledAt);
    const oneHourBefore = 60 * 60 * 1000;
    const timeUntilScheduled = scheduledTime.getTime() - now.getTime();
    
    if (timeUntilScheduled > oneHourBefore) {
      return res.status(403).json({ 
        error: 'Interview cannot be started more than 1 hour before scheduled time',
        scheduledAt: interview.scheduledAt 
      });
    }

    // Activate interview and set start time
    const updatedInterview = await prisma.interview.update({
      where: { uniqueLink },
      data: {
        isActive: true,
        actualStartedAt: now
      }
    });

  // Get AI welcome message
  const resumeSummary = await getResumeSummary(interview.application.resumeUrl || undefined);
  const aiInterviewer = createAIInterviewer(interview.application.job, interview.application, resumeSummary);
    const welcomeResponse = await aiInterviewer.getNextQuestion();
    const welcomeMessage = welcomeResponse.question;

    res.json({
      interview: updatedInterview,
      welcomeMessage
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI conversation endpoint
router.post('/:uniqueLink/chat', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;
    const { message, isFirstMessage } = req.body;

  const interview = await prisma.interview.findUnique({
      where: { uniqueLink },
      include: {
        application: {
          include: {
      job: true
          }
        }
      }
    });

    if (!interview || !interview.isActive) {
      return res.status(404).json({ error: 'Interview not found or not active' });
    }

    // Get AI response
  const resumeSummary = await getResumeSummary(interview.application.resumeUrl || undefined);
  const aiInterviewer = createAIInterviewer(interview.application.job, interview.application, resumeSummary);
    
    // If there's existing transcript, restore conversation history
    if (interview.aiTranscript && !isFirstMessage) {
      // Parse transcript and restore conversation state
      // For simplicity, we'll get the next question based on current state
    }
    
    const aiResponse = await aiInterviewer.getNextQuestion(message);
    const responseText = aiResponse.question;

    // Update transcript
    const updatedTranscript = interview.aiTranscript 
      ? `${interview.aiTranscript}\n\nCandidate: ${message}\nAI: ${responseText}`
      : `Candidate: ${message}\nAI: ${responseText}`;

    await prisma.interview.update({
      where: { uniqueLink },
      data: {
        aiTranscript: updatedTranscript
      }
    });

    res.json({ response: responseText });
  } catch (error) {
    console.error('Error processing AI chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload screenshot
router.post('/:uniqueLink/screenshot', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;
    const { imageData } = req.body;

    const interview = await prisma.interview.findUnique({
      where: { uniqueLink }
    });

    if (!interview || !interview.isActive) {
      return res.status(404).json({ error: 'Interview not found or not active' });
    }

    // Save screenshot
    const imageUrl = await saveBase64Screenshot(imageData, uniqueLink);

    const screenshot = await prisma.screenshot.create({
      data: {
        interviewId: interview.id,
        imageUrl
      }
    });

    res.json(screenshot);
  } catch (error) {
    console.error('Error saving screenshot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End interview
router.post('/:uniqueLink/end', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;
    const { recordingData } = req.body;

  const interview = await prisma.interview.findUnique({
      where: { uniqueLink },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: {
                  select: {
                    email: true
                  }
                }
              }
            },
            job: {
              include: {
                recruiter: {
                  include: {
                    user: {
                      select: {
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const now = new Date();

    // Save recording if provided
    let recordingUrl = null;
    if (recordingData) {
      recordingUrl = await saveRecording(recordingData, uniqueLink);
      await prisma.interviewRecording.create({
        data: {
          interviewId: interview.id,
          videoUrl: recordingUrl,
          recordingType: 'VIDEO'
        }
      });
    }

    // Generate AI summary and scoring
  const resumeSummary = await getResumeSummary(interview.application.resumeUrl || undefined);
  const aiInterviewer = createAIInterviewer(interview.application.job, interview.application, resumeSummary);
    const aiAnalysis = await aiInterviewer.generateInterviewSummary();

    // Update interview
    const updatedInterview = await prisma.interview.update({
      where: { uniqueLink },
      data: {
        isActive: false,
        endedAt: now,
        aiSummary: aiAnalysis.summary,
        strengths: aiAnalysis.strengths.join(', '),
        weaknesses: aiAnalysis.weaknesses.join(', '),
        overallRating: aiAnalysis.scores.overall
      }
    });

    // Create interview score
    await prisma.interviewScore.create({
      data: {
        interviewId: interview.id,
        communicationScore: aiAnalysis.scores.communication,
        technicalScore: aiAnalysis.scores.technical,
        problemSolvingScore: aiAnalysis.scores.problemSolving,
        culturalFitScore: aiAnalysis.scores.culturalFit,
        totalScore: aiAnalysis.scores.overall,
        details: aiAnalysis.scores
      }
    });

    // Update application status
    await prisma.application.update({
      where: { id: interview.applicationId },
      data: { status: 'INTERVIEW_COMPLETED' }
    });

    // Send report to recruiter
    // await sendInterviewReport(
    //   interview.application.job.recruiter.user.email,
    //   interview.application.candidate.user.email,
    //   interview.application.job.title,
    //   aiAnalysis.summary,
    //   [], // screenshots will be sent separately
    //   recordingUrl || undefined
    // );

    res.json({
      interview: updatedInterview,
      analysis: aiAnalysis
    });
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interview results (recruiter only)
router.get('/:uniqueLink/results', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const { uniqueLink } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { recruiterProfile: true }
    });

    if (!user || user.role !== 'RECRUITER' || !user.recruiterProfile) {
      return res.status(403).json({ error: 'Access denied. Recruiter profile required.' });
    }

    const interview = await prisma.interview.findUnique({
      where: { uniqueLink },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: {
                  select: {
                    email: true
                  }
                }
              }
            },
            job: true
          }
        },
        score: true,
        recordings: true,
        screenshots: true
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Verify the interview belongs to the recruiter's job
    if (interview.application.job.recruiterId !== user.recruiterProfile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(interview);
  } catch (error) {
    console.error('Error fetching interview results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
