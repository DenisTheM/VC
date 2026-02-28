import { useEffect } from "react";
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

  const needsLogin = !loading && (!user || !profile);
  const wrongRole = !loading && profile && profile.role !== requiredRole;

  useEffect(() => {
    if (needsLogin) {
      window.location.href = "/app/login";
    } else if (wrongRole && profile) {
      window.location.href = profile.role === "admin" ? "/app/docgen" : "/app/portal";
    }
  }, [needsLogin, wrongRole, profile]);

  if (loading || needsLogin || wrongRole) {
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

  return (
    <AuthContext.Provider value={{ user: user!, profile: profile! }}>
      {children}
    </AuthContext.Provider>
  );
}
