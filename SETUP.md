# Gym Management CRM - Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Git

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd shacdn-gym
npm install
```

### 2. Supabase Setup

#### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be ready

#### Run Database Setup

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Create a new query
4. Copy and paste the contents of `database/schema.sql`
5. Run the query
6. Then copy and paste the contents of `database/setup.sql`
7. Run the setup query

#### Configure Authentication

1. Go to Authentication > Settings in your Supabase dashboard
2. Enable email authentication
3. Configure redirect URLs:
   - Site URL: `http://localhost:5173` (for development)
   - Redirect URLs: `http://localhost:5173/auth/callback`

### 3. Environment Configuration

1. Copy the environment template:
   ```bash
   cp env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   You can find these values in your Supabase project settings under "API".

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Database Schema Overview

Our database includes the following main components:

### Core Tables
- **profiles**: User profile information
- **gyms**: Gym information and settings
- **members**: Member management
- **staff**: Staff and trainer management
- **membership_packages**: Available membership plans
- **memberships**: Active member subscriptions

### Financial Management
- **payments**: Payment tracking and receipts
- **invoices**: Invoice generation and management
- **expenses**: Gym operational expenses
- **staff_payroll**: Staff salary and commission tracking

### Operations
- **attendance**: Daily attendance tracking
- **training_sessions**: Personal training sessions
- **inquiries**: Lead management and conversion
- **equipment**: Equipment inventory and maintenance

### Communication
- **notifications**: In-app notifications
- **communication_templates**: Email/SMS templates

## Initial Data Setup

### Option 1: Use Seed Data

If you want to start with sample data:

1. Go to Supabase SQL Editor
2. Run the contents of `database/seed_data.sql`
3. This will create sample packages, equipment, and templates

### Option 2: Manual Setup

1. **Create your first gym owner account**:
   - Visit the signup page
   - Register as a gym owner
   - Complete your profile

2. **Set up your gym**:
   - Navigate to Settings
   - Fill in gym information
   - Configure operating hours
   - Add facilities

3. **Create membership packages**:
   - Go to Settings > Packages
   - Create trial packages (1-day, 2-day, 7-day)
   - Create regular packages (monthly, annual)
   - Set pricing and features

## User Roles and Access

### Gym Owner
- Full access to all features
- Gym management and configuration
- Financial reports and analytics
- Staff and member management

### Manager
- Operations management
- Staff supervision
- Member management
- Basic financial access

### Trainer
- Member training sessions
- Personal schedule management
- Client progress tracking
- Basic member information

### Member
- Personal profile management
- Membership and payment history
- Training session booking
- Attendance tracking

## Key Features

### Member Management
- **Trial Management**: Track 1-day, 2-day, and 7-day trials
- **Membership Packages**: Flexible pricing and duration options
- **Payment Tracking**: Multiple payment methods and installments
- **Personal Training**: Trainer assignment and session management

### Staff Management
- **Role-based Access**: Different permissions for different roles
- **Attendance Tracking**: Daily check-in/out for staff
- **Payroll Management**: Salary, commission, and bonus tracking
- **Performance Metrics**: Track trainer conversions and performance

### Financial Features
- **Payment Processing**: Cash, card, bank transfer, UPI support
- **Invoice Generation**: Automated invoice creation and tracking
- **Expense Management**: Categorized expense tracking
- **Financial Reports**: Revenue, profit/loss, and analytics

### Operational Tools
- **Attendance System**: Member and staff attendance tracking
- **Equipment Management**: Inventory and maintenance scheduling
- **Lead Management**: Inquiry to conversion pipeline
- **Communication**: Email/SMS templates and notifications

## Development Guidelines

### Code Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Input, etc.)
│   ├── features/       # Feature-specific components
│   └── layout/         # Layout components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API services and business logic
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
└── context/            # React context providers
```

### Adding New Features

1. **Database Changes**:
   - Create migration files in `database/migrations/`
   - Update TypeScript types in `src/types/`
   - Add necessary RLS policies

2. **API Services**:
   - Create service files in `src/services/`
   - Use Supabase client for database operations
   - Implement error handling

3. **UI Components**:
   - Follow Shadcn UI patterns
   - Create reusable components
   - Implement proper TypeScript types

4. **State Management**:
   - Use React Query for server state
   - React Context for global app state
   - Local state for component-specific data

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application: `npm run build`
2. Upload the `dist` folder to your hosting provider
3. Configure environment variables on your hosting platform

## Troubleshooting

### Common Issues

1. **Authentication not working**:
   - Check Supabase URL and keys in `.env.local`
   - Verify redirect URLs in Supabase dashboard
   - Ensure authentication is enabled

2. **Database errors**:
   - Check RLS policies are properly set up
   - Verify user has correct role in auth.users metadata
   - Check database schema is properly migrated

3. **Permission errors**:
   - Verify user role is correctly set during signup
   - Check RLS policies match your access requirements
   - Ensure user is associated with correct gym

### Getting Help

1. Check the database schema documentation in `database/README.md`
2. Review the application architecture
3. Check Supabase documentation for authentication and RLS
4. Look at the sample data for expected data structures

## Next Steps

After setup, you can:

1. **Customize the application**:
   - Modify branding and styling
   - Add custom fields to database tables
   - Implement additional features

2. **Configure integrations**:
   - Set up email SMTP for notifications
   - Configure SMS/WhatsApp for communications
   - Add payment gateway integration

3. **Deploy to production**:
   - Set up production Supabase project
   - Configure production environment variables
   - Deploy to your hosting platform

4. **Monitor and maintain**:
   - Set up error monitoring
   - Monitor database performance
   - Regular backups and maintenance

Congratulations! You now have a fully functional Gym Management CRM system. 🎉
