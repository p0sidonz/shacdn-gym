# Gym Management CRM Database Schema

## Overview

This database schema is designed for a comprehensive Gym Management CRM system that supports multiple user roles, membership management, financial tracking, staff management, and operational features.

## Architecture

The database is built for **Supabase/PostgreSQL** with the following key features:
- Row Level Security (RLS) for data isolation
- Automatic timestamp management
- Comprehensive indexing for performance
- Extensible design for future features

## Core Entities

### 1. User Management
- **`profiles`**: User profile information linked to Supabase Auth
- **`gyms`**: Gym information and configuration
- **`staff`**: Staff management with roles and payroll
- **`members`**: Member profiles and gym assignments

### 2. Membership System
- **`membership_packages`**: Available membership plans and pricing
- **`memberships`**: Active member subscriptions
- **`inquiries`**: Lead management and conversion tracking
- **`inquiry_followups`**: Follow-up communications tracking

### 3. Financial Management
- **`payments`**: Payment records and transactions
- **`invoices`**: Invoice generation and management
- **`expenses`**: Gym operational expenses
- **`staff_payroll`**: Staff salary and commission tracking

### 4. Operations
- **`attendance`**: Daily attendance for members and staff
- **`training_sessions`**: Personal training session management
- **`gym_holidays`**: Holiday calendar management
- **`equipment`**: Equipment inventory and maintenance
- **`equipment_maintenance`**: Maintenance history and scheduling

### 5. Communication
- **`notifications`**: In-app notifications
- **`communication_templates`**: Email/SMS templates

## User Roles

The system supports the following user roles:

1. **`gym_owner`**: Full system access and gym management
2. **`manager`**: Operations management and staff supervision
3. **`trainer`**: Member training and session management
4. **`housekeeping`**: Facility maintenance access
5. **`member`**: Personal profile and membership access

## Key Features

### Membership Management
- **Trial Memberships**: 1-day, 2-day, 7-day trial options
- **Flexible Packages**: Monthly, annual, student, senior, corporate plans
- **Auto-expiration**: Automatic status updates based on end dates
- **Personal Training**: Trainer assignment and session tracking

### Financial Tracking
- **Payment Processing**: Multiple payment methods support
- **Invoice Generation**: Automated invoice creation
- **Expense Management**: Categorized expense tracking
- **Staff Payroll**: Salary, commission, and bonus management

### Operational Features
- **Attendance Tracking**: Daily check-in/check-out for all users
- **Equipment Management**: Inventory and maintenance scheduling
- **Holiday Management**: Gym closure tracking
- **Lead Management**: Inquiry to conversion pipeline

### Communication System
- **Template Management**: Reusable email/SMS templates
- **Notification System**: In-app notifications
- **Multi-channel**: Email, SMS, WhatsApp support

## Setup Instructions

### 1. Database Creation

```sql
-- Run the schema creation script
\i database/schema.sql

-- Insert sample data (optional)
\i database/seed_data.sql
```

### 2. Supabase Configuration

1. Create a new Supabase project
2. Run the schema.sql in the SQL editor
3. Configure Row Level Security policies
4. Set up authentication providers
5. Configure storage buckets for file uploads

### 3. Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   profiles  │    │    gyms     │    │    staff    │
│             │    │             │    │             │
│ user_id (FK)│    │ owner_id(FK)│    │ gym_id (FK) │
│ first_name  │    │ name        │    │ user_id(FK) │
│ last_name   │    │ address     │    │ role        │
│ phone       │    │ facilities  │    │ salary      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   members   │    │ membership_ │    │  payments   │
│             │    │  packages   │    │             │
│ gym_id (FK) │    │             │    │ member_id   │
│ user_id(FK) │    │ gym_id (FK) │    │ amount      │
│ member_id   │    │ name        │    │ status      │
│ trainer(FK) │    │ price       │    │ method      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│memberships  │    │ attendance  │    │  expenses   │
│             │    │             │    │             │
│ member_id   │    │ user_id(FK) │    │ gym_id (FK) │
│ package(FK) │    │ gym_id (FK) │    │ category    │
│ start_date  │    │ date        │    │ amount      │
│ end_date    │    │ status      │    │ description │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:

1. **Data Isolation**: Users can only access data from their gym
2. **Role-based Access**: Different permissions for different user roles
3. **Owner Controls**: Gym owners have full access to their gym's data
4. **Member Privacy**: Members can only see their own data

### Example Policy

```sql
-- Members can only view their own data
CREATE POLICY "Members can view own data" ON members 
FOR SELECT USING (auth.uid() = user_id);

-- Gym staff can manage all members in their gym
CREATE POLICY "Gym staff can manage members" ON members 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM staff s
        JOIN gyms g ON s.gym_id = g.id
        WHERE s.user_id = auth.uid() 
        AND s.status = 'active'
        AND g.id = members.gym_id
    )
);
```

## Indexes and Performance

Key indexes for optimal performance:

- **User lookups**: `idx_profiles_user_id`, `idx_members_user_id`
- **Gym-based queries**: `idx_members_gym_id`, `idx_payments_gym_id`
- **Date-based queries**: `idx_payments_date`, `idx_expenses_date`
- **Attendance tracking**: `idx_attendance_gym_user_date`

## Data Types and Constraints

### JSONB Usage
- **`operating_hours`**: Weekly schedule configuration
- **`invoice_items`**: Invoice line items
- **`maintenance_schedule`**: Equipment maintenance patterns

### Enums
- Type safety for status fields
- Consistent data entry
- Query optimization

### Constraints
- Foreign key relationships maintain data integrity
- Unique constraints prevent duplicates
- Check constraints ensure valid data ranges

## Migration Strategy

For production deployment:

1. **Schema Versioning**: Use numbered migration files
2. **Backward Compatibility**: Ensure migrations don't break existing functionality
3. **Data Migration**: Plan for existing data transformation
4. **Rollback Strategy**: Prepare rollback scripts for each migration

## Monitoring and Maintenance

### Regular Tasks
- Monitor query performance using `pg_stat_statements`
- Update table statistics with `ANALYZE`
- Monitor storage usage and plan archiving
- Review and optimize slow queries

### Backup Strategy
- Daily automated backups via Supabase
- Test restore procedures monthly
- Document recovery procedures

## Extensions and Customization

The schema is designed to be extensible:

1. **Custom Fields**: Add JSONB columns for gym-specific data
2. **Additional Roles**: Extend user_role enum as needed
3. **Integration Points**: Add webhook/API integration tables
4. **Reporting Views**: Create materialized views for complex reports

## Troubleshooting

### Common Issues

1. **RLS Policy Conflicts**: Check policy overlap and precedence
2. **Performance Issues**: Review query plans and index usage
3. **Data Consistency**: Monitor foreign key violations
4. **Authentication Issues**: Verify auth.users integration

### Debug Queries

```sql
-- Check RLS policy execution
SELECT * FROM pg_policies WHERE tablename = 'members';

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

This comprehensive schema provides a solid foundation for building a full-featured gym management system with room for growth and customization.
