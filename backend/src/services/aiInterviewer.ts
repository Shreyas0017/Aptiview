import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface InterviewContext {
  jobTitle: string;
  jobDescription: string;
  candidateName?: string;
  customQuestions?: string[];
  interviewContext?: string;
  customInterviewContext?: string; // New field for job-specific custom context
  candidateResumeUrl?: string;
  candidateCoverLetter?: string;
  resumeSummary?: string;
  // Enhanced template configuration
  aiTemplateId?: string;
  scoringWeights?: {
    communicationWeight: number;
    technicalWeight: number;
    problemSolvingWeight: number;
    culturalFitWeight: number;
  };
  interviewDuration?: number;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
}

interface InterviewQuestion {
  question: string;
  followUpQuestion?: string;
}

// Template configurations
const TEMPLATE_CONTEXTS = {
  'technical-focus': 'Focus heavily on technical skills, coding abilities, and problem-solving approaches. Ask about specific technologies, frameworks, and methodologies. Probe deep into technical challenges they\'ve faced and how they solved them.',
  'behavioral-focus': 'Focus on behavioral questions, teamwork, communication skills, and cultural fit. Explore how they handle challenges, work with others, and adapt to different situations.',
  'leadership-focus': 'Focus on leadership experience, decision-making abilities, and potential for growth. Ask about times they\'ve led projects, made difficult decisions, or mentored others.',
  'startup-focus': 'Focus on adaptability, resourcefulness, and comfort with ambiguity. Ask about their ability to wear multiple hats, work in fast-paced environments, and handle uncertainty.',
  'customer-focus': 'Focus on customer-centric thinking, user experience, and service orientation. Ask about how they understand and solve customer problems.',
};

const DIFFICULTY_ADJUSTMENTS = {
  'beginner': 'Keep questions simple and foundational. Focus on basic concepts and entry-level scenarios.',
  'intermediate': 'Ask moderately complex questions that require some experience and problem-solving.',
  'advanced': 'Challenge the candidate with complex scenarios, edge cases, and senior-level decision making.',
};

export class AIInterviewer {
  private context: InterviewContext;
  private conversationHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  private currentQuestionIndex = 0;
  private maxQuestions = 10;

  constructor(context: InterviewContext) {
    this.context = context;
    this.initializeSystem();
  }

  private initializeSystem() {
    // Calculate max questions based on duration (rough estimate: 2-3 minutes per question)
    const estimatedQuestionsFromDuration = this.context.interviewDuration 
      ? Math.floor(this.context.interviewDuration / 2.5) 
      : this.maxQuestions;
    this.maxQuestions = Math.min(Math.max(estimatedQuestionsFromDuration, 5), 15);

    // Get template-specific context
    const templateContext = this.context.aiTemplateId && TEMPLATE_CONTEXTS[this.context.aiTemplateId as keyof typeof TEMPLATE_CONTEXTS]
      ? TEMPLATE_CONTEXTS[this.context.aiTemplateId as keyof typeof TEMPLATE_CONTEXTS]
      : '';

    // Get difficulty adjustment
    const difficultyAdjustment = this.context.difficultyLevel && DIFFICULTY_ADJUSTMENTS[this.context.difficultyLevel]
      ? DIFFICULTY_ADJUSTMENTS[this.context.difficultyLevel]
      : '';

    const systemPrompt = `
You are an AI interviewer conducting a professional job interview for the position of ${this.context.jobTitle}.

Job Description: ${this.context.jobDescription}

${templateContext ? `Interview Focus: ${templateContext}` : ''}

${this.context.interviewContext || this.context.customInterviewContext ? `Additional Context: ${this.context.interviewContext || this.context.customInterviewContext}` : ''}

${this.context.customQuestions?.length ? `
Custom Questions to Include:
${this.context.customQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
` : ''}

${difficultyAdjustment ? `Difficulty Level: ${difficultyAdjustment}` : ''}

${this.context.interviewDuration ? `Target Duration: Aim for approximately ${this.context.interviewDuration} minutes total.` : ''}

${this.context.scoringWeights ? `
Scoring Focus (for your evaluation):
- Communication Skills: ${this.context.scoringWeights.communicationWeight}%
- Technical Knowledge: ${this.context.scoringWeights.technicalWeight}%
- Problem Solving: ${this.context.scoringWeights.problemSolvingWeight}%
- Cultural Fit: ${this.context.scoringWeights.culturalFitWeight}%
` : ''}

 ${this.context.resumeSummary ? `Candidate Resume Summary: ${this.context.resumeSummary}` : this.context.candidateResumeUrl ? `Candidate Resume (URL): ${this.context.candidateResumeUrl}` : ''}
 ${this.context.candidateCoverLetter ? `Candidate Cover Letter: ${this.context.candidateCoverLetter}` : ''}

Guidelines:
1. Be professional, friendly, and engaging
2. Ask relevant questions based on the job requirements and template focus
3. Listen to answers and ask follow-up questions when appropriate
4. Assess communication skills, technical knowledge, and cultural fit
5. Keep questions concise and clear
6. Adapt questions based on candidate responses
7. Maintain a conversational flow
8. Don't ask more than ${this.maxQuestions} questions total
9. End the interview gracefully when complete
10. Tailor question complexity to the specified difficulty level

Start by greeting the candidate and asking them to introduce themselves.
`;

    this.conversationHistory.push({
      role: 'system',
      content: systemPrompt
    });
  }

  async getNextQuestion(candidateResponse?: string): Promise<{
    question: string;
    isComplete: boolean;
    questionNumber: number;
  }> {
    if (candidateResponse) {
      this.conversationHistory.push({
        role: 'user',
        content: candidateResponse
      });
    }

    if (this.currentQuestionIndex >= this.maxQuestions) {
      return {
        question: "Thank you for taking the time to interview with us today. This concludes our interview. We'll be in touch with you soon regarding next steps. Have a great day!",
        isComplete: true,
        questionNumber: this.currentQuestionIndex + 1
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: this.conversationHistory,
        max_tokens: 200,
        temperature: 0.7,
      });

      const question = response.choices[0]?.message?.content || "Could you tell me more about yourself?";
      
      this.conversationHistory.push({
        role: 'assistant',
        content: question
      });

      this.currentQuestionIndex++;

      return {
        question,
        isComplete: false,
        questionNumber: this.currentQuestionIndex
      };
    } catch (error) {
      console.error('Error generating question:', error);
      return {
        question: "I apologize, but I'm having technical difficulties. Could you please try again?",
        isComplete: false,
        questionNumber: this.currentQuestionIndex + 1
      };
    }
  }

  async generateInterviewSummary(): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    scores: {
      communication: number;
      technical: number;
      problemSolving: number;
      culturalFit: number;
      overall: number;
    };
    recommendation: string;
  }> {
    const summaryPrompt = `
Based on the interview conversation, provide a comprehensive analysis of the candidate:

Interview Transcript:
${this.conversationHistory
  .filter(msg => msg.role !== 'system')
  .map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`)
  .join('\n')}

Please provide:
1. A detailed summary of the candidate's performance
2. Key strengths demonstrated
3. Areas for improvement or weaknesses
4. Scores (1-10) for: Communication, Technical Skills, Problem Solving, Cultural Fit
5. Overall recommendation (Hire/Consider/Reject)

Format your response as JSON with the following structure:
{
  "summary": "Detailed summary here...",
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "scores": {
    "communication": 8,
    "technical": 7,
    "problemSolving": 6,
    "culturalFit": 9
  },
  "recommendation": "Hire/Consider/Reject with brief explanation"
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // Calculate overall score
      const scores = analysis.scores || {};
      const overall = (
        (scores.communication || 0) +
        (scores.technical || 0) +
        (scores.problemSolving || 0) +
        (scores.culturalFit || 0)
      ) / 4;

      return {
        summary: analysis.summary || 'Interview analysis unavailable',
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        scores: {
          communication: scores.communication || 0,
          technical: scores.technical || 0,
          problemSolving: scores.problemSolving || 0,
          culturalFit: scores.culturalFit || 0,
          overall: Math.round(overall * 10) / 10
        },
        recommendation: analysis.recommendation || 'Further review needed'
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      return {
        summary: 'Error generating interview summary',
        strengths: [],
        weaknesses: [],
        scores: { communication: 0, technical: 0, problemSolving: 0, culturalFit: 0, overall: 0 },
        recommendation: 'Technical error - manual review required'
      };
    }
  }

  getConversationHistory() {
    return this.conversationHistory.filter(msg => msg.role !== 'system');
  }
}

// Factory function to create AI interviewer with job-specific configuration
export function createAIInterviewerFromJob(job: any, application: any, resumeSummary?: string): AIInterviewer {
  const context: InterviewContext = {
    jobTitle: job.title,
    jobDescription: job.description,
    candidateName: application.candidate?.user?.email,
    candidateResumeUrl: application.resumeUrl,
    candidateCoverLetter: application.coverLetter,
    resumeSummary: resumeSummary,
    
    // Use job-specific template configuration
    aiTemplateId: job.aiTemplateId,
    customInterviewContext: job.customInterviewContext,
    interviewContext: job.interviewContext, // Fallback to legacy field
    customQuestions: job.customQuestionsList?.length > 0 
      ? job.customQuestionsList 
      : (job.customQuestions ? [job.customQuestions] : []), // Handle legacy field
    
    scoringWeights: job.scoringWeights ? {
      communicationWeight: job.scoringWeights.communicationWeight || 25,
      technicalWeight: job.scoringWeights.technicalWeight || 25,
      problemSolvingWeight: job.scoringWeights.problemSolvingWeight || 25,
      culturalFitWeight: job.scoringWeights.culturalFitWeight || 25,
    } : undefined,
    
    interviewDuration: job.interviewDuration || 20,
    difficultyLevel: job.difficultyLevel || 'intermediate',
  };

  return new AIInterviewer(context);
}

// Keep the original factory function for backward compatibility
export function createAIInterviewer(job: any, application: any, resumeSummary?: string): AIInterviewer {
  return createAIInterviewerFromJob(job, application, resumeSummary);
}
