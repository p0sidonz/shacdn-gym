import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Auth Pages
import SignIn from '@/pages/auth/SignIn'
import SignUp from '@/pages/auth/SignUp'

// Layout
import Layout from '@/components/layout/Layout'

// Dashboard Pages
import OwnerDashboard from '@/pages/dashboard/OwnerDashboard'
import MemberDashboard from '@/pages/dashboard/MemberDashboard'
import TrainerDashboard from '@/pages/dashboard/TrainerDashboard'
import ManagerDashboard from '@/pages/dashboard/ManagerDashboard'

// Feature Pages
import Members from '@/pages/members/Members'
import Staff from '@/pages/staff/Staff'
import Trainers from '@/pages/trainers/Trainers'
import Inquiries from '@/pages/inquiries/Inquiries'
import Payments from '@/pages/payments/Payments'
import Refunds from '@/pages/refunds/Refunds'
import Attendance from '@/pages/attendance/Attendance'
import AttendanceScan from '@/pages/public/AttendanceScan'
import FinancialDashboard from '@/pages/finance/FinancialDashboard'
import Reports from '@/pages/reports/Reports'
import Settings from '@/pages/settings/Settings'
import MembershipPackages from '@/pages/packages/MembershipPackages'
import PermissionManager from '@/components/permissions/PermissionManager'
import ActivityLogs from '@/pages/audit/ActivityLogs'

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode
  allowedRoles?: string[]
}> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

// Public Route Component (redirect if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    // Redirect based on role
    const redirectPath = role === 'gym_owner' || role === 'manager' || role === 'trainer' 
      ? '/dashboard' 
      : '/member/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}

// Dashboard Router Component to show different dashboards based on role
const DashboardRouter: React.FC = () => {
  const { role } = useAuth()
  
  if (!role) {
    return <div>Loading...</div>
  }

  switch (role) {
    case 'gym_owner':
      return <OwnerDashboard />
    case 'manager':
      return <ManagerDashboard />
    case 'trainer':
    case 'nutritionist':
      return <TrainerDashboard />
    case 'receptionist':
    case 'housekeeping':
      return <ManagerDashboard /> // Receptionist and housekeeping use manager dashboard with limited access
    default:
      return <OwnerDashboard />
  }
}

// App Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/signin"
        element={
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />
      <Route
        path="/scan"
        element={<AttendanceScan />}
      />

      {/* Protected Routes with Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard Routes - Different dashboards based on role */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager', 'trainer', 'nutritionist', 'receptionist', 'housekeeping']}>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="members"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager', 'trainer']}>
              <Members />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <Staff />
            </ProtectedRoute>
          }
        />
        <Route
          path="trainers"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <Trainers />
            </ProtectedRoute>
          }
        />
        <Route
          path="inquiries"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <Inquiries />
            </ProtectedRoute>
          }
        />
        <Route
          path="packages"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <MembershipPackages />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="refunds"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <Refunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager', 'receptionist']}>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <FinancialDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit/logs"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="permissions"
          element={
            <ProtectedRoute allowedRoles={['gym_owner']}>
              <PermissionManager />
            </ProtectedRoute>
          }
        />

        {/* Member Routes */}
        <Route
          path="member/dashboard"
          element={
            <ProtectedRoute allowedRoles={['member']}>
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
       

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Unauthorized page */}
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
              <p className="text-xl text-gray-600 mb-8">Access Denied</p>
              <p className="text-gray-500">You don't have permission to access this page.</p>
            </div>
          </div>
        }
      />

      {/* 404 page */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-8">Page Not Found</p>
              <p className="text-gray-500">The page you're looking for doesn't exist.</p>
            </div>
          </div>
        }
      />
    </Routes>
  )
}

// Main App Component
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <AppRoutes />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App