# Prept

**Live:** [prept.fit](https://prept.fit)

A multi-tenant SaaS platform for fitness coaches — client management, workout and nutrition programming, scheduling, billing, real-time messaging, and a full mobile app. One codebase powers the coach dashboard, client portal, public landing pages, and native iOS/Android apps.

## Mobile App (React Native / Expo)

Cross-platform native app built with **Expo SDK 54**, **Expo Router**, **NativeWind**, and **TanStack Query**. Shares the same backend API as the web app.

**Client screens:** Dashboard home, workout plans with set logging, nutrition plans, daily habit tracking, group training with session sign-up, check-in submissions, progress photos, session booking, payments, real-time messaging, and push notifications.

**Coach screens:** Client list with detail views, schedule management, messaging threads, group training, payments overview, and push notifications.

**Key mobile tech:**
- Expo Router for file-based navigation with role-based tab layouts (client vs coach)
- NativeWind (TailwindCSS) for styling with the same design tokens as the web app
- TanStack Query for data fetching, caching, and optimistic updates
- Pusher for real-time messaging
- Expo Notifications for push notifications
- Expo Secure Store for auth token persistence
- Expo Image Picker for progress photo uploads
- Expo Haptics for tactile feedback
- React Native Gifted Charts for progress visualizations
- React Native Reanimated for animations

```
mobile/
├── app/
│   ├── (client)/            # Client role screens
│   │   ├── (tabs)/          # Tab bar: home, workouts, nutrition, habits, more
│   │   ├── workouts/        # Plan detail + set logging
│   │   ├── book.tsx         # Session booking
│   │   ├── check-ins.tsx    # Check-in submissions
│   │   ├── group-training/  # Groups and session sign-up
│   │   ├── messages.tsx     # Chat with coach
│   │   ├── notifications/   # Push notification feed
│   │   ├── payments.tsx     # Payment history
│   │   └── progress.tsx     # Photos and charts
│   ├── (coach)/             # Coach role screens
│   │   ├── (tabs)/          # Tab bar: home, clients, schedule, messages, more
│   │   ├── clients/         # Client detail views
│   │   ├── group-training/  # Group management
│   │   ├── messages/        # Chat threads
│   │   ├── notifications/   # Push notification feed
│   │   └── payments.tsx     # Billing overview
│   ├── login.tsx            # Auth screen
│   └── index.tsx            # Entry / role router
├── components/              # Shared components (skeleton, error boundary)
├── hooks/                   # Data fetching hooks
├── lib/                     # API client, auth, storage, notifications
└── types/                   # Type definitions
```

## Web App Features

### Coach Dashboard
- **Client Management** — Add, edit, and track clients with status, goals, notes, and body measurements
- **Workout Plans** — Reusable templates with exercises, sets, reps, and rest times. Deep-copy assignment per client for personalized editing. AI-powered plan generation
- **Nutrition Plans** — Meal plan templates with per-meal food breakdowns and macros. Deep-copy assignment with inline editing. AI-powered generation and macro auto-fill
- **Programs** — Multi-week workout and nutrition programs that bundle multiple plans into a structured schedule. AI-powered program generation
- **Exercise Library** — 80+ seeded exercises organized by category with full CRUD
- **Food Library** — Searchable food catalog with USDA FoodData Central integration
- **Scheduling** — Manage availability and client bookings with a calendar view
- **Group Training** — Persistent training groups, group sessions (open or group-linked), enrollment management, per-participant workout assignment, attendance tracking
- **Check-Ins** — Create templates, review client submissions, add coach notes
- **Habit Tracking** — Define and assign habit templates
- **Messaging** — Real-time chat via Pusher with emoji support and file sharing
- **Billing** — Record payments, track overdue invoices, global billing dashboard with summary cards
- **Progress Photos** — Upload and review client progress photos over time
- **Public Landing Page** — Each coach gets a public profile page at `/coach/[slug]` with bio, photo, specialties, certificates, pricing packages, social links, and contact info
- **Settings** — Business name, bio, contact info, timezone, logo, coach photo, social links, specialties, certificates, packages

### Client Portal
- **Workouts** — View assigned plans, log completed sets with weights and reps
- **Nutrition** — View assigned meal plans with food details and macros
- **Group Training** — View memberships, upcoming sessions, sign up for open sessions
- **Check-Ins** — Submit periodic check-ins based on coach templates
- **Habits** — Track daily habit completion
- **Progress** — Progress photos and measurement charts
- **Booking** — Book sessions based on coach availability
- **Messages** — Real-time chat with coach
- **Payments** — Payment history and overdue alerts

### Authentication
- Email + password with bcrypt hashing (NextAuth.js, JWT strategy)
- Role-based access (coach, client, admin)
- Client onboarding via email invite tokens
- Forgot password / reset password flow
- Email verification

### Internationalization
- 4 locales: English, Bosnian, Croatian, Serbian
- Language switcher in dashboard and portal navigation

### Admin Panel
- Manage coaches, clients, and templates across tenants
- Usage monitoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (full stack) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js (credentials + JWT) |
| Styling | TailwindCSS + Radix UI |
| Validation | Zod |
| File Storage | Cloudflare R2 (S3-compatible) |
| Real-time | Pusher (web + mobile) |
| Push Notifications | Expo Notifications |
| Email | Resend |
| Rate Limiting | Upstash Redis |
| AI | Gemini 2.0 Flash / Claude (configurable) |
| Mobile | React Native, Expo SDK 54, Expo Router, NativeWind, TanStack Query |
| Hosting | Vercel (Frankfurt) |

## Architecture

### Multi-Tenancy

Every database query is scoped by `session.user.tenantId`. Each coach operates as their own tenant with isolated clients, plans, and settings. Middleware enforces authentication on all protected routes.

### Deep-Copy Assignment

Workout and meal plans use a template-to-copy model. When assigned to a client or group session, the plan and all child records are deep-cloned in a transaction, allowing per-client customization without modifying the original template.

### Group Training

Supports persistent training groups (e.g. "Morning HIIT") and standalone open sessions. Workout plans assigned to a group session are deep-copied per enrolled participant. Late enrollees automatically receive their own copy.

## License

All rights reserved.
