# Project Structure

## App Router Architecture (Next.js 15)

```
app/
├── layout.tsx              # Root layout with fonts and global styles
├── page.tsx               # Landing page with login form
├── globals.css            # Global styles and Tailwind imports
├── middleware.ts          # Authentication middleware
├── favicon.ico           # App icon
│
├── api/                  # API routes
│   ├── sales/           # Sales processing endpoints
│   └── stock-entries/   # Stock management endpoints
│
├── components/          # Reusable UI components
│   └── auth/           # Authentication components
│
├── dashboard/          # Protected dashboard routes
│   ├── admin/         # Administrator dashboard
│   │   ├── components/ # Admin-specific components
│   │   ├── actions.ts  # Server actions for admin operations
│   │   └── page.tsx    # Admin dashboard page
│   └── vendedor/      # Seller dashboard
│       ├── components/ # Sales-specific components
│       └── page.tsx    # Seller dashboard page
│
├── login/             # Authentication pages
├── utils/             # Utility functions
│   └── auth/          # Authentication utilities
│       ├── client.ts  # Browser client
│       └── server.ts  # Server client
│
└── [feature-routes]/  # Additional feature routes
    ├── create-rpc/    # RPC function management
    ├── test-conexion/ # Connection testing
    ├── test-rpc/      # RPC testing
    ├── test-stock/    # Stock testing
    └── ticket/        # Receipt/ticket functionality
```

## Key Conventions

### File Naming
- **page.tsx**: Route pages
- **layout.tsx**: Layout components
- **actions.ts**: Server actions
- **components/**: Component directories within features
- **kebab-case**: For route folders
- **PascalCase**: For component files

### Component Organization
- Feature-based component organization within each route
- Shared components in `/app/components/`
- Route-specific components in `[route]/components/`

### Database Integration
- Authentication utilities for JWT handling
- RPC functions for complex database operations
- Server actions for mutations and form handling

### Authentication Flow
- Middleware handles session management
- Role-based routing (admin vs vendedor)
- Protected routes require authentication

### Styling Approach
- Tailwind CSS with custom theme variables
- Global styles in `globals.css`
- Component-level styling with Tailwind classes
- Responsive design patterns throughout