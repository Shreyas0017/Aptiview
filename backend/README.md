# Aptiview Backend API

The backend API server for Aptiview, built with Node.js, Express, and TypeScript. Provides REST API endpoints and WebSocket connectivity for the AI interview platform.

## 🏗️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **AI Services**: OpenAI API (GPT-4, Whisper, TTS)
- **Real-time**: WebSocket (ws library)
- **File Upload**: ImageKit (CDN) via SDK; Multer legacy fallback
- **CORS**: Express CORS middleware

## 📁 Project Structure

```
backend/
├── src/
│   ├── routes/           # API route handlers
│   │   ├── user.ts      # User management and jobs
│   │   ├── interview.ts # Interview management
│   │   └── index.ts     # Route exports
│   ├── services/        # Business logic services
│   │   ├── simpleVoiceInterviewer.ts  # AI interview engine
│   │   └── fileService.ts             # File upload handling
│   ├── middleware/      # Express middleware
│   │   └── requireClerkAuth.ts        # Authentication
│   ├── types/          # TypeScript type definitions
│   │   └── express/    # Express type extensions
│   ├── db.ts           # Database connection
│   ├── index.ts        # Main application entry
│   └── websocketServer.ts  # WebSocket server
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── uploads/            # Legacy local storage (kept for fallback)
├── dist/              # Compiled JavaScript (production)
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- OpenAI API key
- Clerk account for authentication

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

3. **Configure Environment Variables**
   ```bash
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/aptiview"
   
   # Authentication (Clerk)
   CLERK_SECRET_KEY="sk_test_..."
   CLERK_PUBLISHABLE_KEY="pk_test_..."
   
   # OpenAI
   OPENAI_API_KEY="sk-proj-..."
   
   # Email (Optional)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASSWORD="your-app-password"
   
   # Frontend URL
   FRONTEND_URL="http://localhost:3000"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   
   # Optional: Open Prisma Studio
   npx prisma studio
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` with WebSocket support.

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run test` - Run tests (if configured)

## 📡 API Endpoints

### Authentication
All protected routes require a valid Clerk JWT token in the Authorization header:
```
Authorization: Bearer <clerk-jwt-token>
```

### User Management
- `GET /api/users/me` - Get current user profile
- `POST /api/users/profile` - Update user profile
- `GET /api/users/dashboard-stats` - Get dashboard statistics

### Job Management
- `GET /api/users/jobs` - Get all jobs (with application filtering)
- `POST /api/users/jobs` - Create new job (recruiters only)
- `GET /api/users/jobs/:id` - Get specific job details
- `PUT /api/users/jobs/:id` - Update job (recruiters only)
- `DELETE /api/users/jobs/:id` - Delete job (recruiters only)
- `GET /api/users/my-jobs` - Get recruiter's jobs

### Applications
- `POST /api/users/applications` - Apply for a job
- `GET /api/users/applications` - Get user's applications
- `GET /api/users/jobs/:id/applications` - Get job applications (recruiters only)

### Interviews
- `GET /api/interviews/:uniqueLink` - Get interview details
- `POST /api/interviews/:id/start` - Start interview
- `POST /api/interviews/:id/end` - End interview
- `GET /api/users/interviews` - Get user's interviews
- `GET /api/users/interviews/:id/recordings` - Get interview recordings

### AI Templates
- `GET /api/users/ai-templates` - Get predefined AI interview templates

## 🔌 WebSocket Events

Connect to: `ws://localhost:4000/interview/<uniqueLink>`

### Client → Server Events
- `audio-data` - Send audio data for transcription
- `text-message` - Send text message (fallback)
- `screenshot` - Send screenshot data
- `end-interview` - End the interview

### Server → Client Events
- `interview-ready` - Interview setup complete
- `audio-chunk` - AI response audio data
- `transcript-update` - Conversation transcript update
- `interview-complete` - Interview finished
- `error` - Error messages

## 🗄️ Database Schema

### Key Models

- **User**: Base user information
- **RecruiterProfile**: Recruiter-specific data
- **CandidateProfile**: Candidate-specific data
- **Job**: Job postings with AI interview configuration
- **Application**: Job applications
- **Interview**: Interview sessions with recordings
- **InterviewScore**: AI-generated interview scores
- **InterviewRecording**: Audio/video recordings
- **Screenshot**: Interview screenshots

### Relationships

- Users have one profile (Recruiter or Candidate)
- Recruiters create multiple Jobs
- Candidates submit Applications for Jobs
- Applications have one Interview
- Interviews have multiple Recordings and Screenshots

## 🤖 AI Interview Engine

The `SimpleVoiceInterviewer` service handles:

- Natural conversation flow
- Speech-to-text using OpenAI Whisper
- Contextual question generation
- Text-to-speech using OpenAI TTS
- Interview scoring and analysis
- Transcript generation

### Features

- Human-like conversation patterns
- Intelligent follow-up questions
- Graceful handling of unclear audio
- Custom interview templates
- Real-time transcription
- Automatic interview scoring

## 📁 Media Storage

Supports uploads for:
- Interview recordings (audio)
- Screenshots during interviews

Production storage uses ImageKit CDN. Files are uploaded via server-side SDK and stored under folders:
- `/aptiview/recordings`
- `/aptiview/screenshots`

Legacy local storage under `/uploads` remains for backward compatibility only.

Environment variables:
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT` (e.g., https://ik.imagekit.io/your_id)

## 🔐 Security Features

- JWT authentication via Clerk
- Role-based access control
- Input validation and sanitization
- File upload restrictions
- CORS protection
- Environment variable protection

## 🌐 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables (Production)

```bash
NODE_ENV=production
DATABASE_URL="your-production-database-url"
CLERK_SECRET_KEY="your-production-clerk-secret"
CLERK_PUBLISHABLE_KEY="your-production-clerk-publishable"
OPENAI_API_KEY="your-openai-api-key"
FRONTEND_URL="https://your-frontend-domain.com"
```

### Render Deployment

1. **Build Command**: `npm install && npx prisma generate && npm run build`
2. **Start Command**: `npm start`
3. **Root Directory**: `backend`

## 🔧 Configuration

### Database Configuration

The application uses Prisma with PostgreSQL. Database connection is configured via `DATABASE_URL` environment variable.

### OpenAI Configuration

Configure OpenAI API key in environment variables. The application uses:
- **GPT-4**: For interview conversation and scoring
- **Whisper-1**: For speech-to-text transcription
- **TTS-1-HD**: For text-to-speech responses

### Authentication

Clerk handles authentication. Configure your Clerk application and add the keys to environment variables.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and DATABASE_URL is correct
2. **Prisma Client**: Run `npx prisma generate` after schema changes
3. **Authentication**: Verify Clerk keys and ensure they match your Clerk application
4. **Media Uploads**: Verify ImageKit credentials and URL endpoint; for legacy local, check `/uploads` permissions
5. **WebSocket**: Ensure no port conflicts on port 4000

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and logging.

## 📊 Monitoring

The application includes:
- Health check endpoint: `GET /health`
- Comprehensive error logging
- Request/response logging in development
- Database query logging via Prisma

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include input validation
4. Update database schema via Prisma migrations
5. Add JSDoc comments for complex functions
6. Follow the existing code structure

## 📄 API Documentation

For detailed API documentation, consider using tools like:
- Swagger/OpenAPI
- Postman collections
- API Blueprint

---

For frontend documentation, see `/frontend/README.md`
