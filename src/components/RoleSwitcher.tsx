"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Role } from "@/types";

const ROLE_LABELS: Record<Role, string> = {
  buyer:                "Buyer",
  seller:               "Seller",
  admin:                "Admin",
  hub_manager:          "Hub Manager",
  qc_leader:            "QC Team Leader",
  qc_checker:           "QC Checker",
  delivery_hub_manager: "Delivery Hub Manager",
  delivery_distributor: "Delivery Man",
  aroth:                "Aroth",
};

const ROLE_DASHBOARDS: Record<Role, string> = {
  buyer:                "/buyer-dashboard",
  seller:               "/seller-dashboard",
  admin:                "/admin",
  hub_manager:          "/hub-manager",
  qc_leader:            "/qc-leader",
  qc_checker:           "/qc-checker",
  delivery_hub_manager: "/delivery-hub",
  delivery_distributor: "/delivery-distributor",
  aroth:                "/aroth-dashboard",
};

export function RoleSwitcher() {
  const { user, roles, role: activeRole, switchRole } = useAuth();
  const router = useRouter();

  if (!user || roles.length <= 1) return null;

  const handleSwitch = async (newRole: string) => {
    try {
      await switchRole(newRole as Role);
      router.push(ROLE_DASHBOARDS[newRole as Role]);
    } catch {
      // silent
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 hidden sm:inline">Viewing as:</span>
      <select
        value={activeRole ?? ""}
        onChange={(e) => handleSwitch(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-400 cursor-pointer"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}
