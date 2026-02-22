import { useAuth } from "../hooks/useAuth";
import { T } from "../styles/tokens";
import { AuthContext } from "./AuthContext";
import type { UserRole } from "../lib/auth";

interface AuthGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
}

export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: T.sans,
          color: T.ink3,
          background: T.s1,
        }}
      >
        Laden...
      </div>
    );
  }

  if (!user || !profile) {
    window.location.href = "/app/login";
    return null;
  }

  if (profile.role !== requiredRole) {
    window.location.href = profile.role === "admin" ? "/app/docgen" : "/app/portal";
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, profile }}>
      {children}
    </AuthContext.Provider>
  );
}
