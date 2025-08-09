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
  candidateResumeUrl?: string;
  candidateCoverLetter?: string;
  resumeSummary?: string;
}

interface InterviewQuestion {
  question: string;
  followUpQuestion?: string;
}

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
    const systemPrompt = `
You are an AI interviewer conducting a professional job interview for the position of ${this.context.jobTitle}.

Job Description: ${this.context.jobDescription}

${this.context.interviewContext ? `Additional Context: ${this.context.interviewContext}` : ''}

${this.context.customQuestions?.length ? `
Custom Questions to Include:
${this.context.customQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
` : ''}

 ${this.context.resumeSummary ? `Candidate Resume Summary: ${this.context.resumeSummary}` : this.context.candidateResumeUrl ? `Candidate Resume (URL): ${this.context.candidateResumeUrl}` : ''}
 ${this.context.candidateCoverLetter ? `Candidate Cover Letter: ${this.context.candidateCoverLetter}` : ''}

Guidelines:
1. Be professional, friendly, and engaging
2. Ask relevant questions based on the job requirements
3. Listen to answers and ask follow-up questions when appropriate
4. Assess communication skills, technical knowledge, and cultural fit
5. Keep questions concise and clear
6. Adapt questions based on candidate responses
7. Maintain a conversational flow
8. Don't ask more than ${this.maxQuestions} questions total
9. End the interview gracefully when complete

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
