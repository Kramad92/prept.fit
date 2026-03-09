# TrainerHub

A multi-tenant SaaS platform for fitness coaches to manage their clients, workouts, nutrition plans, scheduling, and billing — all in one place.

Built with Next.js 14, Prisma, PostgreSQL, and TailwindCSS.

## Features

### Coach Dashboard
- **Client Management** — Add, edit, and track clients with status, goals, notes, and body measurements
- **Workout Plans** — Create reusable workout templates with exercises, sets, reps, and rest times. Assign copies to individual clients for personalized editing. AI-powered plan generation from text descriptions
- **Nutrition Plans** — Build meal plan templates with per-meal food breakdowns and macros. Assign to clients with inline editing. AI-powered meal plan generation and macro auto-fill
- **Exercise Library** — 80+ seeded exercises organized by category (Chest, Back, Legs, etc.) with full CRUD management
- **Food Library** — Searchable food catalog with USDA FoodData Central integration for quick meal plan assembly
- **Scheduling** — Manage availability and client bookings with a calendar view
- **Group Training** — Create persistent training groups, schedule group sessions (open or group-linked), enroll participants, assign workout plans (deep-copied per participant), and track attendance
- **Check-Ins** — Create check-in templates, review client submissions, and add coach notes
- **Habit Tracking** — Define habit templates and assign them to clients
- **Messaging** — Real-time chat with clients via Pusher, with emoji support and file sharing
- **Billing** — Record payments per client, track overdue invoices, and view a global billing dashboard with summary cards
- **Progress Photos** — Upload and review client progress photos over time (S3/R2 storage)
- **Settings** — Customize business name, bio, contact info, timezone, and brand color

### Client Portal
- **Workouts** — View assigned workout plans, log completed sets with weights and reps
- **Nutrition** — View assigned meal plans with food details and macros
- **Group Training** — View group memberships, upcoming enrolled sessions, and sign up for open sessions
- **Check-Ins** — Submit periodic check-ins based on coach templates
- **Habits** — Track daily habit completion
- **Progress** — View progress photos and measurement charts over time
- **Booking** — Book sessions based on coach availability
- **Messages** — Chat with coach
- **Payments** — View payment history and overdue alerts

### Mobile App
React Native client app built with Expo (SDK 54) for iOS and Android. Includes workouts, nutrition, habits, check-ins, progress tracking, group training, session booking, payments, real-time messaging, and notifications.

### Internationalization
- Full i18n support with 4 locales: English, Bosnian, Croatian, Serbian
- Language switcher in both dashboard and portal navigation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (credentials + JWT) |
| Styling | TailwindCSS |
| Icons | Lucide React |
| Validation | Zod |
| File Storage | AWS S3 / Cloudflare R2 |
| Real-time | Pusher |
| AI | Gemini 2.0 Flash / Claude (configurable) |
| Mobile | Expo, Expo Router, NativeWind, TanStack Query |

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login and registration pages
│   ├── api/                 # API routes (REST endpoints)
│   │   ├── clients/         # Client CRUD, measurements, payments, workouts, nutrition
│   │   ├── workouts/        # Workout plan CRUD, assignment, duplication
│   │   ├── meal-plans/      # Meal plan CRUD, assignment, duplication
│   │   ├── exercise-library/# Exercise catalog management + seed
│   │   ├── food-library/    # Food catalog management
│   │   ├── check-ins/       # Check-in templates and submissions
│   │   ├── habits/          # Habit templates, assignment, logging
│   │   ├── messages/        # Coach-client messaging
│   │   ├── payments/        # Billing overview
│   │   ├── schedules/       # Schedule management
│   │   ├── training-groups/ # Training group CRUD, member management
│   │   ├── group-sessions/  # Group session CRUD, enrollment, attendance, workout assignment
│   │   ├── ai/              # AI endpoints (generate plans, fill macros)
│   │   ├── portal/          # Client-facing API (group sessions, training groups)
│   │   ├── settings/        # Tenant settings
│   │   └── ...
│   ├── dashboard/           # Coach-facing pages
│   │   ├── clients/         # Client list and detail (tabbed: overview, photos, workouts, nutrition, payments, stats)
│   │   ├── workouts/        # Workout template list, create, edit
│   │   ├── nutrition/       # Meal plan template list
│   │   ├── exercises/       # Exercise library management
│   │   ├── billing/         # Global billing dashboard
│   │   ├── schedule/        # Calendar and availability
│   │   ├── group-training/  # Training groups and group sessions
│   │   ├── check-ins/       # Check-in management
│   │   ├── habits/          # Habit template management
│   │   ├── messages/        # Messaging threads
│   │   └── settings/        # Business settings
│   └── portal/              # Client-facing pages
│       ├── workouts/        # View plans, log workouts
│       ├── nutrition/       # View meal plans
│       ├── group-training/  # Groups, enrolled sessions, open session sign-up
│       ├── check-ins/       # Submit check-ins
│       ├── habits/          # Track habits
│       ├── progress/        # Photos and charts
│       ├── book/            # Book sessions
│       ├── payments/        # Payment history
│       └── messages/        # Chat with coach
├── components/
│   ├── ai/                  # AI UI components (generate workout/meal plan, fill macros)
│   ├── client/              # Client-specific components (workout tab, nutrition tab, payments tab, etc.)
│   ├── group-training/      # Group training components (session card, new session form)
│   ├── layout/              # Sidebar, top bar, mobile nav, portal nav
│   ├── ui/                  # Reusable UI (avatar, status badge, toast, empty state, skeleton)
│   └── ...
├── hooks/                   # Custom hooks (useApi data fetching)
├── lib/                     # Utilities (prisma, auth, session, S3, i18n, validation, AI)
├── services/                # Server-side business logic (deep-copy, group session enrollment)
└── types/                   # Shared TypeScript interfaces

mobile/                      # React Native (Expo) client app
├── app/                     # Expo Router screens
├── components/              # Shared mobile components
├── hooks/                   # Mobile-specific hooks
├── lib/                     # API client, auth, storage
└── types/                   # Mobile type definitions
```

## Architecture

### Multi-Tenancy

Every data query is scoped by `session.user.tenantId`. Each coach operates as their own tenant with isolated clients, plans, and settings. Middleware enforces authentication on all `/api/*` and `/dashboard/*` routes.

### Deep-Copy Assignment

Workout and meal plans use a template-to-copy pattern. When a plan is assigned to a client (or a group session), a deep copy is created (plan + exercises/meals), allowing per-client customization without modifying the original template.

### Group Training

Supports both persistent training groups (e.g. "Morning HIIT") and standalone open sessions. When a workout plan is assigned to a group session, it is deep-copied to each enrolled participant. Late enrollees automatically receive their own copy.

## License

This project is private and not licensed for distribution.
