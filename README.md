# FUTURE YOU

A hackathon project to visualize your future self based on today's habits. Built with React, TypeScript, Node.js, Supabase, and Groq AI.

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **Lucide React** for icons
- **Supabase JS** for authentication & database

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Supabase** for PostgreSQL database & Auth
- **Groq SDK** for AI predictions
- **Zod** for validation
- **Helmet, CORS, Morgan** for security & logging

## Project Structure

```
future-you/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── layouts/         # Layout components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API & Supabase services
│   │   ├── contexts/        # React contexts (Auth, Theme)
│   │   ├── types/           # TypeScript types
│   │   └── assets/          # Static assets
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                  # Node.js/Express backend
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic
│   │   ├── prediction-engine/ # AI prediction logic
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/                 # Supabase migrations & config
│   └── migrations/
│
├── package.json              # Root workspace package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Groq API key

### Installation

1. **Clone and install dependencies:**
```bash
cd future-you
npm run install:all
```

2. **Set up environment variables:**
```bash
# Copy example env files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Edit with your actual values
```

3. **Set up Supabase:**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/`
   - Enable Email/Password authentication
   - Get your project URL and anon key

4. **Get Groq API Key:**
   - Sign up at https://console.groq.com
   - Create an API key

### Development

Run both frontend and backend concurrently:
```bash
npm run dev
```

Or run separately:
```bash
# Frontend (port 5173)
npm run dev:frontend

# Backend (port 3001)
npm run dev:backend
```

### Building for Production

```bash
npm run build
```

## Environment Variables

### Frontend (.env)
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Backend (.env)
| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default: 3001) |
| `NODE_ENV` | Environment (development/production) |
| `FRONTEND_URL` | Frontend URL for CORS |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GROQ_API_KEY` | Groq API key for AI predictions |
| `GROQ_MODEL` | Groq model (default: mixtral-8x7b-32768) |
| `JWT_SECRET` | JWT secret for tokens |

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/user` - Get current user

### Habits
- `GET /api/habits` - List habits (with pagination, filters)
- `GET /api/habits/stats` - Get dashboard statistics
- `GET /api/habits/:id` - Get single habit
- `POST /api/habits` - Create habit
- `PATCH /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `GET /api/habits/:id/logs` - Get habit logs
- `POST /api/habits/logs` - Create habit log
- `PATCH /api/habits/logs/:id` - Update habit log
- `DELETE /api/habits/logs/:id` - Delete habit log

### Predictions
- `GET /api/predictions` - List predictions
- `POST /api/predictions/generate` - Generate new predictions
- `GET /api/predictions/forecast` - Get habit forecasts
- `GET /api/predictions/insights` - Get AI insights
- `GET /api/predictions/confidence-distribution` - Get confidence stats

### Profile
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update profile
- `GET /api/profile/preferences` - Get preferences
- `PATCH /api/profile/preferences` - Update preferences
- `POST /api/profile/avatar` - Upload avatar
- `DELETE /api/profile/account` - Delete account

### Health
- `GET /api/health` - Health check
- `GET /api/health/ready` - Readiness check
- `GET /api/health/live` - Liveness check

## Database Schema

Key tables:
- `profiles` - User profiles (extends auth.users)
- `habits` - User habits
- `habit_logs` - Daily habit tracking logs
- `predictions` - AI-generated predictions

## Features

- 🔐 **Authentication** - Supabase Auth with email/password
- 📊 **Dashboard** - Real-time stats, charts, and progress
- 🎯 **Habit Tracking** - Create, track, and manage habits
- 🤖 **AI Predictions** - Groq-powered future predictions
- 📈 **Analytics** - Completion rates, streaks, trends
- 🌙 **Dark Mode** - Full theme support
- 📱 **Responsive** - Mobile-first design
- ⚡ **Real-time** - Live updates with Supabase

## Scripts

```bash
# Root
npm run dev              # Run both frontend & backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only
npm run build            # Build all workspaces
npm run install:all      # Install all dependencies

# Frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Backend
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm run start            # Run compiled JS
npm run lint             # Run ESLint
```

## Deployment

### Frontend (Vercel/Netlify)
1. Connect repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables

### Backend (Railway/Render/Fly.io)
1. Connect repository
2. Set build command: `npm run build`
3. Set start command: `npm run start`
4. Add environment variables
5. Ensure database migrations run

## License

MIT License - feel free to use for your own projects!