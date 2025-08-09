import OpenAI from 'openai';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface VoiceInterviewConfig {
  jobTitle: string;
  jobDescription: string;
  customQuestions?: string[];
  candidateName?: string;
}

export class VoiceInterviewer extends EventEmitter {
  private openai: OpenAI;
  private config: VoiceInterviewConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private transcript: Array<{ role: 'assistant' | 'user', content: string, timestamp: Date }> = [];
  private conversationContext: string = '';

  constructor(config: VoiceInterviewConfig) {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.config = config;
    this.setupConversationContext();
  }

  private setupConversationContext() {
    this.conversationContext = `You are conducting a professional job interview for the position of ${this.config.jobTitle}.

Job Description: ${this.config.jobDescription}

Instructions:
- Conduct a natural, conversational interview
- Ask relevant questions about the candidate's experience, skills, and fit for the role
- Be professional but friendly
- Listen carefully and ask follow-up questions
- Keep responses concise but thorough
- If interrupted, acknowledge and let the candidate speak
- Ask about 5-7 key questions covering: experience, technical skills, problem-solving, team work, and motivation
- End the interview naturally after covering all important areas

${this.config.customQuestions ? `Custom questions to include: ${this.config.customQuestions.join(', ')}` : ''}

Start by greeting the candidate${this.config.candidateName ? ` (${this.config.candidateName})` : ''} and introducing yourself as their AI interviewer.`;
  }

  async startInterview(): Promise<void> {
    try {
      // Connect to WebSocket
      this.ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-3.5-turbo`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.ws.on('open', () => {
        console.log('Connected to OpenAI Realtime API');
        this.isConnected = true;
        this.emit('connected');

        // Send session configuration
        this.sendMessage({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'alloy',
            instructions: this.conversationContext,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.7,
            max_response_output_tokens: 4096
          }
        });

        // Start the conversation
        this.sendMessage({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: 'Start the interview by greeting the candidate and introducing yourself.'
          }
        });
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());
        this.handleRealtimeMessage(message);
      });

      this.ws.on('close', () => {
        console.log('Disconnected from OpenAI Realtime API');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('Error starting voice interview:', error);
      throw error;
    }
  }

  private handleRealtimeMessage(message: any) {
    switch (message.type) {
      case 'response.audio.delta':
        // Forward audio chunks to client
        this.emit('audio-chunk', message.delta);
        break;

      case 'response.audio_transcript.delta':
        // Handle transcript updates
        this.emit('transcript-delta', message.delta);
        break;

      case 'response.audio_transcript.done':
        // Complete transcript
        const assistantMessage = {
          role: 'assistant' as const,
          content: message.transcript,
          timestamp: new Date()
        };
        this.transcript.push(assistantMessage);
        this.emit('assistant-message', assistantMessage);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcription
        const userMessage = {
          role: 'user' as const,
          content: message.transcript,
          timestamp: new Date()
        };
        this.transcript.push(userMessage);
        this.emit('user-message', userMessage);
        break;

      case 'response.done':
        this.emit('response-complete');
        break;

      case 'error':
        console.error('Realtime API error:', message.error);
        this.emit('error', message.error);
        break;

      default:
        // Log other message types for debugging
        console.log('Realtime message:', message.type);
    }
  }

  sendAudioChunk(audioData: Buffer): void {
    if (this.isConnected && this.ws) {
      this.sendMessage({
        type: 'input_audio_buffer.append',
        audio: audioData.toString('base64')
      });
    }
  }

  commitAudio(): void {
    if (this.isConnected && this.ws) {
      this.sendMessage({
        type: 'input_audio_buffer.commit'
      });
    }
  }

  clearAudioBuffer(): void {
    if (this.isConnected && this.ws) {
      this.sendMessage({
        type: 'input_audio_buffer.clear'
      });
    }
  }

  interruptAssistant(): void {
    if (this.isConnected && this.ws) {
      this.sendMessage({
        type: 'response.cancel'
      });
    }
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  endInterview(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  getTranscript(): Array<{ role: 'assistant' | 'user', content: string, timestamp: Date }> {
    return this.transcript;
  }

  async generateFinalSummary(): Promise<{
    summary: string;
    scores: {
      communication: number;
      technical: number;
      problemSolving: number;
      culturalFit: number;
    };
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  }> {
    const fullTranscript = this.transcript
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    const prompt = `Based on this interview transcript for the position of ${this.config.jobTitle}, provide a comprehensive analysis:

TRANSCRIPT:
${fullTranscript}

JOB DESCRIPTION:
${this.config.jobDescription}

Please provide:
1. A detailed summary of the candidate's responses and performance
2. Scores (1-10) for: Communication, Technical Skills, Problem Solving, Cultural Fit
3. Top 3 strengths
4. Top 3 areas for improvement
5. Hiring recommendation (Strong Hire, Hire, No Hire, Strong No Hire)

Format as JSON:
{
  "summary": "detailed summary",
  "scores": {
    "communication": 8,
    "technical": 7,
    "problemSolving": 9,
    "culturalFit": 8
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendation": "Hire"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }
}
