# Technology Stack

## Framework & Runtime
- **Next.js 15**: React framework with App Router architecture
- **React 19**: Latest React with concurrent features
- **TypeScript 5**: Strict typing throughout the codebase
- **Node.js 18+**: Runtime environment

## Styling & UI
- **Tailwind CSS 4**: Utility-first CSS framework with custom theme
- **Headless UI**: Accessible React components
- **Geist Fonts**: Modern font family (Sans & Mono variants)
- **Recharts**: Data visualization and charting library

## Backend & Database
- **PostgreSQL**: Robust relational database
- **JWT Auth**: Custom authentication and user management
- **Custom API**: RESTful API for database operations
- **RPC Functions**: Custom database functions for complex queries

## Development Tools
- **ESLint 9**: Code linting with Next.js configuration
- **PostCSS**: CSS processing
- **Turbopack**: Fast bundler for development (--turbopack flag)

## Common Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Setup
- Copy `.env.local` with PostgreSQL credentials
- Required variables: `DATABASE_URL`, `JWT_SECRET`

## Key Patterns
- **Server Components**: Default for data fetching
- **Client Components**: Use "use client" directive when needed
- **Server Actions**: For form submissions and mutations
- **Middleware**: Authentication and session management
- **RPC Functions**: Complex database operations
- **TypeScript Strict Mode**: All code must be properly typed