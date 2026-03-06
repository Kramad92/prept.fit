# TrainerHub

A multi-tenant SaaS platform for fitness coaches to manage their clients, workouts, nutrition plans, scheduling, and billing — all in one place.

Built with Next.js 14, Prisma, PostgreSQL, and TailwindCSS.

## Features

### Coach Dashboard
- **Client Management** — Add, edit, and track clients with status, goals, notes, and body measurements
- **Workout Plans** — Create reusable workout templates with exercises, sets, reps, and rest times. Assign copies to individual clients for personalized editing
- **Nutrition Plans** — Build meal plan templates with per-meal food breakdowns and macros. Assign to clients with inline editing
- **Exercise Library** — 80+ seeded exercises organized by category (Chest, Back, Legs, etc.) with full CRUD management
- **Food Library** — Searchable food catalog for quick meal plan assembly
- **Scheduling** — Manage availability and client bookings with a calendar view
- **Check-Ins** — Create check-in templates, review client submissions, and add coach notes
- **Habit Tracking** — Define habit templates and assign them to clients
- **Messaging** — Real-time chat threads between coach and each client
- **Billing** — Record payments per client, track overdue invoices, and view a global billing dashboard with summary cards
- **Progress Photos** — Upload and review client progress photos over time (S3/R2 storage)
- **Settings** — Customize business name, bio, contact info, timezone, and brand color (dynamically applied across the UI)

### Client Portal
- **Workouts** — View assigned workout plans, log completed sets with weights and reps
- **Nutrition** — View assigned meal plans with food details and macros
- **Check-Ins** — Submit periodic check-ins based on coach templates
- **Habits** — Track daily habit completion
- **Progress** — View progress photos and measurement charts over time
- **Booking** — Book sessions based on coach availability
- **Messages** — Chat with coach

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js |
| Styling | TailwindCSS |
| Icons | Lucide React |
| Validation | Zod |
| File Storage | AWS S3 / Cloudflare R2 |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- (Optional) S3-compatible storage for progress photos

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/trainerhub.git
   cd trainerhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database URL and NextAuth secret:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/trainerhub"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-random-secret"
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed        # Optional: seed initial data
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

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
│   │   ├── settings/        # Tenant settings
│   │   └── ...
│   ├── dashboard/           # Coach-facing pages
│   │   ├── clients/         # Client list and detail (tabbed: overview, photos, workouts, nutrition, payments, stats)
│   │   ├── workouts/        # Workout template list, create, edit
│   │   ├── nutrition/       # Meal plan template list
│   │   ├── exercises/       # Exercise library management
│   │   ├── billing/         # Global billing dashboard
│   │   ├── schedule/        # Calendar and availability
│   │   ├── check-ins/       # Check-in management
│   │   ├── habits/          # Habit template management
│   │   ├── messages/        # Messaging threads
│   │   └── settings/        # Business settings
│   └── portal/              # Client-facing pages
│       ├── workouts/        # View plans, log workouts
│       ├── nutrition/       # View meal plans
│       ├── check-ins/       # Submit check-ins
│       ├── habits/          # Track habits
│       ├── progress/        # Photos and charts
│       ├── book/            # Book sessions
│       └── messages/        # Chat with coach
├── components/
│   ├── client/              # Client-specific components (workout tab, nutrition tab, payments tab, etc.)
│   ├── layout/              # Sidebar, top bar, mobile nav, portal nav
│   ├── ui/                  # Reusable UI (avatar, status badge, toast, empty state)
│   └── ...
├── lib/                     # Utilities (prisma client, auth, session, S3, validation schemas)
└── types/                   # Shared TypeScript interfaces
```

## Architecture

### Multi-Tenancy

Every data query is scoped by `session.user.tenantId`. Each coach operates as their own tenant with isolated clients, plans, and settings. Middleware enforces authentication on all `/api/*` and `/dashboard/*` routes.

### Deep-Copy Assignment

Workout and meal plans use a template-to-copy pattern. When a plan is assigned to a client, a deep copy is created (plan + exercises/meals), allowing per-client customization without modifying the original template.

### Dynamic Brand Colors

Each tenant has a `brandColor` setting. A `BrandColorProvider` component generates an HSL shade palette from the hex value and applies it as CSS custom properties, so TailwindCSS `brand-*` utilities update dynamically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio |

## License

This project is private and not licensed for distribution.
