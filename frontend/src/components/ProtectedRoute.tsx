import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/layout/BottomNav";

type Role = "client" | "trainer";

interface ProtectedRouteProps {
  /** Leave empty for pages that both clients and trainers can open. */
  role?: Role;
}

const dashboardFor = (role: Role | null) =>
  role === "trainer" ? "/trainer/dashboard" : "/dashboard";

/**
 * Wraps a group of routes.
 * - Not logged in: sent to the matching login page.
 * - Logged in with the wrong role: sent to their own dashboard.
 */
const ProtectedRoute = ({ role }: ProtectedRouteProps) => {
  const { user, token, userType, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (!user || !token || !userType) {
    // Shared pages (schedules, a trainer's public profile) go to the client login,
    // which links to the trainer login.
    return <Navigate to={role === "trainer" ? "/trainer/login" : "/"} replace />;
  }

  if (role && userType !== role) {
    return <Navigate to={dashboardFor(userType)} replace />;
  }

  const trainerTheme = userType === "trainer";

  return (
    <div className={trainerTheme ? "trainer-gold min-h-screen bg-background text-foreground" : undefined}>
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

export default ProtectedRoute;
