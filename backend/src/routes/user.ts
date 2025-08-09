import { Router, Response } from 'express';
import { requireClerkAuth, ClerkAuthRequest } from '../middleware/requireClerkAuth';
import { prisma } from '../db';

const router = Router();

// Debug endpoint to check user existence (remove in production)
router.get('/debug/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        recruiterProfile: true,
        candidateProfile: true
      }
    });
    res.json({ exists: !!user, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user (alias for profile)
router.get('/me', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    console.log(`/me endpoint - ClerkID: ${userId}`);
    
    if (!userId) {
      console.log('/me endpoint - No userId found in request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        recruiterProfile: true,
        candidateProfile: true
      }
    });

    if (!user) {
      console.log(`/me endpoint - User not found in database for ClerkID: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`/me endpoint - User found: ${user.email}, Role: ${user.role}`);
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Provision user (create if doesn't exist)
router.post('/provision', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, role, profile } = req.body;
    
    console.log(`Provisioning user - ClerkID: ${userId}, Email: ${email}, Role: ${role}, Profile:`, profile);

    // Use upsert but handle email conflicts manually
    try {
      const user = await prisma.user.upsert({
        where: { clerkId: userId },
        update: {
          email: email || undefined,
          role: role || undefined
        },
        create: {
          clerkId: userId,
          email: email || '',
          role: role || null
        },
        include: {
          recruiterProfile: true,
          candidateProfile: true
        }
      });

      // Create profile if role and profile data are provided
      if (role === 'CANDIDATE' && profile && !user.candidateProfile) {
        await prisma.candidateProfile.create({
          data: {
            userId: user.id,
            education: profile.education || null,
            experience: profile.experience || null,
            skills: profile.skills || null
          }
        });
        console.log('Created candidate profile');
      } else if (role === 'RECRUITER' && profile && !user.recruiterProfile) {
        await prisma.recruiterProfile.create({
          data: {
            userId: user.id,
            company: profile.company || '',
            industry: profile.industry || null
          }
        });
        console.log('Created recruiter profile');
      }

      // Fetch updated user with profiles
      const updatedUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
          recruiterProfile: true,
          candidateProfile: true
        }
      });

      console.log(`User provisioned successfully: ${updatedUser?.id}`);
      res.json(updatedUser);
    } catch (upsertError: any) {
      console.error('Upsert failed:', upsertError);
      
      if (upsertError.code === 'P2002' && upsertError.meta?.target?.includes('email')) {
        // Email conflict - try to find the user by clerkId instead
        const existingUser = await prisma.user.findUnique({
          where: { clerkId: userId },
          include: {
            recruiterProfile: true,
            candidateProfile: true
          }
        });
        
        if (existingUser) {
          // User exists, just update the role if provided
          const updatedUser = await prisma.user.update({
            where: { clerkId: userId },
            data: { role: role || existingUser.role },
            include: {
              recruiterProfile: true,
              candidateProfile: true
            }
          });

          // Create profile if role and profile data are provided
          if (role === 'CANDIDATE' && profile && !updatedUser.candidateProfile) {
            await prisma.candidateProfile.create({
              data: {
                userId: updatedUser.id,
                education: profile.education || null,
                experience: profile.experience || null,
                skills: profile.skills || null
              }
            });
            console.log('Created candidate profile for existing user');
          } else if (role === 'RECRUITER' && profile && !updatedUser.recruiterProfile) {
            await prisma.recruiterProfile.create({
              data: {
                userId: updatedUser.id,
                company: profile.company || '',
                industry: profile.industry || null
              }
            });
            console.log('Created recruiter profile for existing user');
          }

          // Fetch final user with profiles
          const finalUser = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: {
              recruiterProfile: true,
              candidateProfile: true
            }
          });

          console.log(`User updated after email conflict: ${finalUser?.id}`);
          res.json(finalUser);
        } else {
          throw upsertError;
        }
      } else {
        throw upsertError;
      }
    }
  } catch (error: any) {
    console.error('Error provisioning user:', error);
    if (error.code === 'P2002') {
      // Prisma unique constraint error
      if (error.meta?.target?.includes('email')) {
        return res.status(409).json({ error: 'Email address is already in use by another account' });
      } else if (error.meta?.target?.includes('clerkId')) {
        return res.status(409).json({ error: 'User account already exists' });
      }
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get user profile
router.get('/profile', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        recruiterProfile: true,
        candidateProfile: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update user profile
router.post('/profile', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { role, profile } = req.body;

    // Get the user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        recruiterProfile: true,
        candidateProfile: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user role if provided
    if (role && user.role !== role) {
      await prisma.user.update({
        where: { clerkId: userId },
        data: { role }
      });
    }

    // Create or update profile based on role
    if (role === 'CANDIDATE' || user.role === 'CANDIDATE') {
      if (user.candidateProfile) {
        // Update existing profile
        await prisma.candidateProfile.update({
          where: { userId: user.id },
          data: {
            education: profile.education || undefined,
            experience: profile.experience || undefined,
            skills: profile.skills || undefined
          }
        });
      } else {
        // Create new profile
        await prisma.candidateProfile.create({
          data: {
            userId: user.id,
            education: profile.education || null,
            experience: profile.experience || null,
            skills: profile.skills || null
          }
        });
      }
    } else if (role === 'RECRUITER' || user.role === 'RECRUITER') {
      if (user.recruiterProfile) {
        // Update existing profile
        await prisma.recruiterProfile.update({
          where: { userId: user.id },
          data: {
            company: profile.company || undefined,
            industry: profile.industry || undefined
          }
        });
      } else {
        // Create new profile
        await prisma.recruiterProfile.create({
          data: {
            userId: user.id,
            company: profile.company || '',
            industry: profile.industry || null
          }
        });
      }
    }

    // Return updated user
    const updatedUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        recruiterProfile: true,
        candidateProfile: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create job posting (recruiter only)
router.post('/jobs', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
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

    const {
      title,
      description,
      location,
      type,
      interviewContext,
      interviewEndDate,
      screenshotInterval,
      customQuestions
    } = req.body;

    const job = await prisma.job.create({
      data: {
        title,
        description,
        location,
        type,
        recruiterId: user.recruiterProfile.id,
        interviewContext: interviewContext || null,
        customQuestions: customQuestions || null,
        interviewEndDate: interviewEndDate ? new Date(interviewEndDate) : null,
        screenshotInterval: screenshotInterval || 30
      }
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all jobs (public endpoint for browsing)
router.get('/jobs', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    
    // Get candidate's applications if user is logged in
    let candidateApplications: string[] = [];
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
          candidateProfile: {
            include: {
              applications: {
                select: {
                  jobId: true
                }
              }
            }
          }
        }
      });
      
      if (user && user.candidateProfile) {
        candidateApplications = user.candidateProfile.applications.map(app => app.jobId);
      }
    }

    const jobs = await prisma.job.findMany({
      where: {
        // Exclude jobs that the candidate has already applied to
        ...(candidateApplications.length > 0 ? {
          id: {
            notIn: candidateApplications
          }
        } : {})
      },
      include: {
        recruiter: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recruiter's jobs
router.get('/my-jobs', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
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

    const jobs = await prisma.job.findMany({
      where: {
        recruiterId: user.recruiterProfile.id
      },
      include: {
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching recruiter jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recruiter stats
router.get('/recruiter-stats', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
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

    const [totalJobs, totalApplications, activeInterviews] = await Promise.all([
      prisma.job.count({
        where: { recruiterId: user.recruiterProfile.id }
      }),
      prisma.application.count({
        where: {
          job: { recruiterId: user.recruiterProfile.id }
        }
      }),
      prisma.interview.count({
        where: {
          application: {
            job: { recruiterId: user.recruiterProfile.id }
          },
          isActive: true
        }
      })
    ]);

    res.json({
      totalJobs,
      totalApplications,
      activeInterviews
    });
  } catch (error) {
    console.error('Error fetching recruiter stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific job
router.get('/jobs/:id', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
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
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get applications for a specific job (recruiter only)
router.get('/jobs/:id/applications', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const { id: jobId } = req.params;

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

    // Verify the job belongs to the recruiter
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        recruiterId: user.recruiterProfile.id
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    const applications = await prisma.application.findMany({
      where: {
        jobId: jobId
      },
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
        interview: {
          include: {
            score: true,
            recordings: true,
            screenshots: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply to job (candidate only)
router.post('/jobs/:id/apply', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const { id: jobId } = req.params;
  const { resumeBase64, coverLetter } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { candidateProfile: true }
    });

    if (!user || user.role !== 'CANDIDATE' || !user.candidateProfile) {
      return res.status(403).json({ error: 'Access denied. Candidate profile required.' });
    }

    // Check if already applied
    const existingApplication = await prisma.application.findFirst({
      where: {
        jobId,
        candidateId: user.candidateProfile.id
      }
    });

    if (existingApplication) {
      return res.status(409).json({ error: 'Already applied to this job' });
    }

    let resumeUrl: string | undefined;
    if (resumeBase64 && typeof resumeBase64 === 'string') {
      // Expect data URL or raw base64 string
      const base64 = resumeBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const { uploadResume } = await import('../services/imageKitService');
      const safeName = `resume_${user.candidateProfile.id}_${Date.now()}.pdf`;
      try {
        resumeUrl = await uploadResume({ buffer, fileName: safeName, mimeType: 'application/pdf' });
      } catch (e) {
        console.error('Resume upload failed:', e);
      }
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId: user.candidateProfile.id,
        status: 'PENDING',
        resumeUrl: resumeUrl || undefined,
        coverLetter: coverLetter || undefined,
      }
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's applications (candidate only)
router.get('/applications', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { candidateProfile: true }
    });

    if (!user || user.role !== 'CANDIDATE' || !user.candidateProfile) {
      return res.status(403).json({ error: 'Access denied. Candidate profile required.' });
    }

    const applications = await prisma.application.findMany({
      where: {
        candidateId: user.candidateProfile.id
      },
      include: {
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
        },
        interview: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recruiter's job applications
router.get('/recruiter/applications', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
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

    const applications = await prisma.application.findMany({
      where: {
        job: {
          recruiterId: user.recruiterProfile.id
        }
      },
      include: {
        job: true,
        candidate: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        },
        interview: {
          include: {
            score: true,
            recordings: true,
            screenshots: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching recruiter applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update application status (recruiter only)
router.patch('/applications/:id/status', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const { id: applicationId } = req.params;
    const { status } = req.body;

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

    // Verify the application belongs to the recruiter's job
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        job: {
          recruiterId: user.recruiterProfile.id
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found or access denied' });
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
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
        job: true,
        interview: true
      }
    });

    res.json(updatedApplication);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get candidate's interviews
router.get('/my-interviews', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { candidateProfile: true }
    });

    if (!user || user.role !== 'CANDIDATE' || !user.candidateProfile) {
      return res.status(403).json({ error: 'Access denied. Candidate profile required.' });
    }

    const interviews = await prisma.interview.findMany({
      where: {
        application: {
          candidateId: user.candidateProfile.id
        }
      },
      include: {
        application: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                location: true,
                recruiter: {
                  select: {
                    company: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        scheduledAt: 'desc'
      }
    });

    res.json(interviews);
  } catch (error) {
    console.error('Error fetching candidate interviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete job posting (recruiter only)
router.delete('/jobs/:id', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const jobId = req.params.id;
    
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

    // Check if job exists and belongs to this recruiter
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          include: {
            interview: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.recruiterId !== user.recruiterProfile.id) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own jobs.' });
    }

    // Check if there are active interviews
    const activeInterviews = job.applications.some(app => 
      app.interview && !app.interview.endedAt
    );

    if (activeInterviews) {
      return res.status(400).json({ 
        error: 'Cannot delete job with active interviews. Please wait for all interviews to complete.' 
      });
    }

    // Delete the job (this will cascade delete applications, interviews, etc.)
    await prisma.job.delete({
      where: { id: jobId }
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update job posting (recruiter only)
router.put('/jobs/:id', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const jobId = req.params.id;
    
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

    // Check if job exists and belongs to this recruiter
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.recruiterId !== user.recruiterProfile.id) {
      return res.status(403).json({ error: 'Access denied. You can only update your own jobs.' });
    }

    const {
      title,
      description,
      location,
      type,
      interviewContext,
      interviewEndDate,
      screenshotInterval,
      customQuestions
    } = req.body;

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        description,
        location,
        type,
        interviewContext,
        interviewEndDate: interviewEndDate ? new Date(interviewEndDate) : null,
        screenshotInterval: screenshotInterval || 30,
        customQuestions
      }
    });

    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI instruction templates
router.get('/ai-templates', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const templates = [
      {
        id: 'technical-focus',
        name: 'Technical Focus',
        description: 'Focus on technical skills and problem-solving abilities',
        context: 'Focus heavily on technical skills, coding abilities, and problem-solving approaches. Ask about specific technologies, frameworks, and methodologies. Probe deep into technical challenges they\'ve faced and how they solved them.',
        questions: [
          'Walk me through a complex technical problem you\'ve solved recently',
          'How do you approach debugging difficult issues?',
          'What technologies do you feel most confident with and why?',
          'Describe your development workflow and best practices'
        ]
      },
      {
        id: 'behavioral-focus',
        name: 'Behavioral Focus',
        description: 'Emphasize soft skills, teamwork, and cultural fit',
        context: 'Focus on behavioral questions, teamwork, communication skills, and cultural fit. Explore how they handle challenges, work with others, and adapt to different situations.',
        questions: [
          'Tell me about a time when you had to work with a difficult team member',
          'How do you handle tight deadlines and pressure?',
          'Describe a situation where you had to learn something completely new',
          'How do you give and receive feedback?'
        ]
      },
      {
        id: 'leadership-focus',
        name: 'Leadership Focus',
        description: 'Assess leadership potential and management skills',
        context: 'Focus on leadership experience, decision-making abilities, and potential for growth. Ask about times they\'ve led projects, made difficult decisions, or mentored others.',
        questions: [
          'Describe a time when you had to lead a project or team',
          'How do you motivate team members who are struggling?',
          'Tell me about a difficult decision you had to make',
          'How do you handle conflicts within your team?'
        ]
      },
      {
        id: 'startup-focus',
        name: 'Startup Environment',
        description: 'Assess adaptability and startup mindset',
        context: 'Focus on adaptability, resourcefulness, and comfort with ambiguity. Ask about their ability to wear multiple hats, work in fast-paced environments, and handle uncertainty.',
        questions: [
          'How do you thrive in ambiguous or rapidly changing situations?',
          'Tell me about a time when you had to do something outside your job description',
          'How do you prioritize when everything seems urgent?',
          'What attracts you to working in a startup environment?'
        ]
      },
      {
        id: 'customer-focus',
        name: 'Customer-Centric',
        description: 'Emphasize customer service and user experience',
        context: 'Focus on customer-centric thinking, user experience, and service orientation. Ask about how they understand and solve customer problems.',
        questions: [
          'How do you approach understanding customer needs?',
          'Tell me about a time when you went above and beyond for a customer',
          'How do you handle difficult or unhappy customers?',
          'Describe how you would improve our customer experience'
        ]
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Error fetching AI templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interview recordings for recruiter
router.get('/interviews/:interviewId/recordings', requireClerkAuth, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const userId = req.clerkUserId;
    const interviewId = req.params.interviewId;

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

    // Get interview with recordings, but first verify it belongs to this recruiter
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: true
          }
        },
        recordings: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.application.job.recruiterId !== user.recruiterProfile.id) {
      return res.status(403).json({ error: 'Access denied. You can only view recordings for your own job interviews.' });
    }

    res.json(interview.recordings);
  } catch (error) {
    console.error('Error fetching interview recordings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
