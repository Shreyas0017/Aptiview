# Aptiview Frontend

A modern, responsive frontend application for the AI interview platform, built with Next.js 14, TypeScript, and Tailwind CSS.

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Authentication**: Clerk
- **State Management**: React hooks
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **HTTP Client**: Fetch API
- **Real-time**: WebSocket
- **Build Tool**: Turbopack (dev)

## 🏗️ Project Structure

```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   ├── candidate/         # Candidate dashboard
│   │   ├── apply/         # Job application
│   │   ├── dashboard/     # Candidate dashboard
│   │   └── jobs/          # Job search
│   ├── recruiter/         # Recruiter dashboard
│   │   ├── dashboard/     # Recruiter dashboard
│   │   └── jobs/          # Job management
│   ├── interview/         # Interview pages
│   │   └── [uniqueLink]/  # Dynamic interview route
│   ├── profile-setup/     # Profile setup flows
│   ├── role-selection/    # Role selection
│   └── sign-in/          # Authentication
├── components/            # Reusable components
│   ├── ui/               # Shadcn/ui components
│   ├── RoleRedirector.tsx # Role-based navigation
│   ├── GlobalUserProvisioner.tsx # User setup
│   └── theme-provider.tsx # Theme management
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── public/               # Static assets
├── styles/               # Additional stylesheets
├── middleware.ts         # Next.js middleware
├── next.config.mjs       # Next.js configuration
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
├── components.json       # Shadcn/ui configuration
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm (preferred) or npm
- Backend API server running

### Installation

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure Environment Variables**
   ```bash
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   
   # API Configuration
   NEXT_PUBLIC_API_URL="http://localhost:4000"
   NEXT_PUBLIC_WS_URL="ws://localhost:4000"
   
   # App Configuration
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`.

## 🔧 Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript check

## 🧭 Smooth Scrolling (Lenis)

- Lenis is enabled globally via a React provider and CSS import.
- Anchor links (e.g., href="#demo") use Lenis smooth scrolling and respect a fixed header offset.

Key locations:
- Provider: `components/LenisRoot.tsx` (anchors offset is set to 80px; autoRaf enabled)
- Wiring: `app/layout.tsx` wraps the app with `LenisRoot` and imports `lenis/dist/lenis.css`

Adjust header offset:
- Update `anchors: { offset: 80 }` in `components/LenisRoot.tsx` if the header height changes.

## 📱 Features

### Authentication & Authorization
- Clerk integration for secure authentication
- Role-based access (Recruiter/Candidate)
- Protected routes with middleware
- User profile management

### Candidate Features
- **Job Search**: Browse and filter available positions
- **Application Management**: Track application status
- **AI Interviews**: Voice-based AI interview system
- **Profile Setup**: Complete candidate profile
- **Dashboard**: Application history and statistics

### Recruiter Features
- **Job Management**: Create, edit, and delete job postings
- **Custom AI Instructions**: Personalized interview prompts
- **Application Review**: View and manage candidate applications
- **Interview Analytics**: Review interview scores and recordings
- **Dashboard**: Recruitment metrics and insights

### Interview System
- **Voice Recognition**: Real-time speech-to-text
- **AI Conversation**: Natural language interview flow
- **Screen Recording**: Optional screenshot capture
- **Live Transcription**: Real-time conversation display
- **Audio Playback**: AI responses with text-to-speech

## 🎨 UI Components

### Design System
- **Shadcn/ui**: High-quality, accessible components
- **Tailwind CSS**: Utility-first styling
- **Dark Mode**: System preference detection
- **Responsive Design**: Mobile-first approach

### Key Components

- **Button**: Various sizes and variants
- **Form**: Integrated with form validation
- **Dialog**: Modal dialogs and alerts
- **Card**: Content containers
- **Table**: Data display with sorting
- **Avatar**: User profile pictures
- **Badge**: Status indicators
- **Skeleton**: Loading states

## 🔄 State Management

### React Hooks Pattern
- **useState**: Local component state
- **useEffect**: Side effects and API calls
- **useContext**: Global state (user, theme)
- **Custom Hooks**: Reusable logic

### Data Flow
1. API calls from components
2. State updates trigger re-renders
3. Optimistic updates for better UX
4. Error handling with toast notifications

## 🌐 API Integration

### HTTP Client
```typescript
// Example API call
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/jobs`, {
  headers: {
    'Authorization': `Bearer ${await getToken()}`,
    'Content-Type': 'application/json',
  },
});
```

### WebSocket Connection
```typescript
// Interview WebSocket
const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/interview/${uniqueLink}`);
```

## 🎯 Routing

### App Router Structure
- **Dynamic Routes**: `[uniqueLink]` for interview sessions
- **Nested Routes**: Organized by user role
- **Route Groups**: `(authenticated)` for protected routes
- **Loading States**: `loading.tsx` for async routes
- **Error Boundaries**: `error.tsx` for error handling

### Navigation
- **Role-based**: Automatic redirection based on user role
- **Protected Routes**: Authentication required
- **Middleware**: Route protection at the edge

## 🔐 Security

### Authentication
- JWT tokens from Clerk
- Automatic token refresh
- Secure cookie storage

### Authorization
- Role-based access control
- Route protection middleware
- API request authentication

### Data Protection
- Input validation and sanitization
- XSS prevention
- CSRF protection via headers

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 0px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Design Principles
- Mobile-first approach
- Touch-friendly interface
- Readable typography
- Accessible color contrast

## 🎭 Theming

### Theme System
- Light/Dark mode support
- System preference detection
- Persistent theme selection
- CSS variables for colors

### Customization
```typescript
// Theme configuration in tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        // ... more colors
      }
    }
  }
}
```

## 🔧 Performance Optimization

### Next.js Features
- **Server Components**: Reduced client-side JavaScript
- **Image Optimization**: Automatic image optimization
- **Font Optimization**: Google Fonts optimization
- **Code Splitting**: Automatic route-based splitting

### Best Practices
- Lazy loading for heavy components
- Memoization for expensive calculations
- Efficient re-renders with proper dependencies
- Optimistic updates for better UX

## 📦 Deployment

### Production Build
```bash
pnpm build
pnpm start
```

### Environment Variables (Production)
```bash
NODE_ENV=production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_API_URL="https://your-api-domain.com"
NEXT_PUBLIC_WS_URL="wss://your-api-domain.com"
NEXT_PUBLIC_APP_URL="https://your-app-domain.com"
```

### Vercel Deployment
1. **Build Command**: `pnpm build`
2. **Output Directory**: `.next`
3. **Install Command**: `pnpm install`
4. **Node.js Version**: 18.x

## 🧪 Testing

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API calls
- End-to-end tests for user flows
- Component testing with React Testing Library

### Test Structure
```bash
# Recommended testing structure
__tests__/
├── components/
├── hooks/
├── utils/
└── integration/
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication**: Ensure Clerk keys are correct
2. **API Calls**: Check CORS and API URL configuration
3. **WebSocket**: Verify WebSocket URL and connection
4. **Styling**: Clear browser cache for CSS changes
5. **Build Errors**: Check TypeScript errors and dependencies

### Debug Tools
- React Developer Tools
- Next.js built-in debugging
- Browser network tab for API calls
- Console logs for WebSocket events

## 📊 Analytics & Monitoring

### Performance Monitoring
- Next.js Analytics
- Core Web Vitals tracking
- User experience metrics
- Error tracking and reporting

### User Analytics
- Page view tracking
- User interaction events
- Conversion funnel analysis
- A/B testing capabilities

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Implement proper error handling
4. Add loading states for async operations
5. Follow the existing component structure
6. Write accessible HTML

### Code Style
- ESLint configuration
- Prettier for formatting
- Consistent naming conventions
- JSDoc comments for complex functions

## 📚 Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [Clerk Documentation](https://clerk.com/docs)

### Learning Materials
- Next.js 14 App Router guide
- TypeScript best practices
- React hooks patterns
- Tailwind CSS utilities

---

For backend documentation, see `/backend/README.md`
For project overview, see `/README.md`
