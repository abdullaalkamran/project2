"use client";

import { useCallback, useEffect, useState } from "react";
import { Role } from "@/types";

const AUTH_CHANGED_EVENT = "paikari-auth-changed";

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  districtId: string | null;
  districtName: string | null;
  hubId: string | null;
  roles: Role[];
  activeRole: Role;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const notifyAuthChanged = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data as AuthUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const handleAuthChanged = () => {
      void fetchMe();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
  }, [fetchMe]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Login failed");
      }
      await fetchMe();
      notifyAuthChanged();
    },
    [fetchMe, notifyAuthChanged]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    notifyAuthChanged();
  }, [notifyAuthChanged]);

  const switchRole = useCallback(
    async (role: Role) => {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Role switch failed");
      await fetchMe();
      notifyAuthChanged();
    },
    [fetchMe, notifyAuthChanged]
  );

  const isLoggedIn = !!user;
  const role = user?.activeRole ?? null;
  const roles = user?.roles ?? [];

  return { user, isLoading, isLoggedIn, role, roles, login, logout, switchRole };
}
