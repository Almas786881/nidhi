import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { seedDatabase } from '@/db/seed';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage';

// Admin
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { InstitutionManagement } from '@/pages/admin/InstitutionManagement';
import { UserManagement } from '@/pages/admin/UserManagement';
import { OfficerAssignment } from '@/pages/admin/OfficerAssignment';
import { AllFdrRecords } from '@/pages/admin/AllFdrRecords';
import { AuditTrailPage } from '@/pages/admin/AuditTrailPage';
import { SystemSettingsPage } from '@/pages/admin/SystemSettingsPage';
import { ReportsPage } from '@/pages/admin/ReportsPage';

// Institution
import { InstitutionDashboard } from '@/pages/institution/InstitutionDashboard';
import { SubmitFdrPage } from '@/pages/institution/SubmitFdrPage';
import { MyFdrsPage } from '@/pages/institution/MyFdrsPage';
import { FdrDetailPage } from '@/pages/institution/FdrDetailPage';
import { ClarificationResponsesPage } from '@/pages/institution/ClarificationResponsesPage';
import { RenewalPage } from '@/pages/institution/RenewalPage';
import { ReleaseRequestsPage } from '@/pages/institution/ReleaseRequestsPage';
import { InstitutionProfilePage } from '@/pages/institution/InstitutionProfilePage';

// Officer
import { OfficerDashboard } from '@/pages/officer/OfficerDashboard';
import { AssignedApplicationsPage } from '@/pages/officer/AssignedApplicationsPage';
import { AiVerificationWorkspacePage } from '@/pages/officer/AiVerificationWorkspacePage';
import { MaturityMonitoringPage } from '@/pages/officer/MaturityMonitoringPage';
import { RenewalReviewPage } from '@/pages/officer/RenewalReviewPage';
import { ReleaseScrutinyPage } from '@/pages/officer/ReleaseScrutinyPage';

// Competent Authority
import { AuthorityDashboard } from '@/pages/authority/AuthorityDashboard';
import { PendingApprovalsPage } from '@/pages/authority/PendingApprovalsPage';
import { ApprovalDetailPage } from '@/pages/authority/ApprovalDetailPage';
import { DecisionHistoryPage } from '@/pages/authority/DecisionHistoryPage';

// Shared
import { NotificationsPage } from '@/pages/shared/NotificationsPage';
import { DocumentRepositoryPage } from '@/pages/shared/DocumentRepositoryPage';
import { BackupRestorePage } from '@/pages/shared/BackupRestorePage';

import type { UserRole } from '@/types';

// Protected Route Guard
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" message="Validating NIDHI security session..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Home Redirector based on user role
const HomeRedirector: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" message="Initializing NIDHI portal..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'INSTITUTION':
      return <Navigate to="/institution" replace />;
    case 'OFFICER':
      return <Navigate to="/officer" replace />;
    case 'AUTHORITY':
      return <Navigate to="/authority" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    // 1. Seed DB on boot if not already seeded
    seedDatabase().then(() => {
      // 2. Initialize stored session
      initAuth();
    });
  }, [initAuth]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Root Role Dispatcher */}
      <Route path="/" element={<HomeRedirector />} />

      {/* Authenticated Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/institutions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <InstitutionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/officers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <OfficerAssignment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/fdrs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AllFdrRecords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AuditTrailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SystemSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/maturity"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MaturityMonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/releases"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ReleaseScrutinyPage />
            </ProtectedRoute>
          }
        />

        {/* Institution Routes */}
        <Route
          path="/institution"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <InstitutionDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/submit"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <SubmitFdrPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/my-fdrs"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <MyFdrsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/fdrs/:id"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN', 'OFFICER']}>
              <FdrDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/clarifications"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <ClarificationResponsesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/renewals"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <RenewalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/releases"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <ReleaseRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/documents"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <DocumentRepositoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/profile"
          element={
            <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
              <InstitutionProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Officer Routes */}
        <Route
          path="/officer"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <OfficerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/applications"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <AssignedApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/applications/:id"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <AiVerificationWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/verification"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <AiVerificationWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/clarifications"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <ClarificationResponsesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/maturity"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <MaturityMonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/renewals"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <RenewalReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/release-scrutiny"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <ReleaseScrutinyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/audit"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
              <AuditTrailPage />
            </ProtectedRoute>
          }
        />

        {/* Competent Authority Routes */}
        <Route
          path="/authority"
          element={
            <ProtectedRoute allowedRoles={['AUTHORITY', 'ADMIN']}>
              <AuthorityDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authority/approvals"
          element={
            <ProtectedRoute allowedRoles={['AUTHORITY', 'ADMIN']}>
              <PendingApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authority/approvals/:id"
          element={
            <ProtectedRoute allowedRoles={['AUTHORITY', 'ADMIN']}>
              <ApprovalDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authority/decision-history"
          element={
            <ProtectedRoute allowedRoles={['AUTHORITY', 'ADMIN']}>
              <DecisionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authority/reports"
          element={
            <ProtectedRoute allowedRoles={['AUTHORITY', 'ADMIN']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Shared Authenticated Routes */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<InstitutionProfilePage />} />
        <Route path="/backup-restore" element={<BackupRestorePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
