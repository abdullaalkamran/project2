"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Chrome } from "lucide-react";
import { Role } from "@/types";

type GoogleMode = "login" | "register";

const roleRedirects: Record<Role, string> = {
  buyer: "/buyer-dashboard",
  seller: "/seller-dashboard",
  admin: "/admin",
  hub_manager: "/hub-manager",
  qc_leader: "/qc-leader",
  qc_checker: "/qc-checker",
  delivery_hub_manager: "/delivery-hub",
  delivery_distributor: "/delivery-distributor",
  aroth:                "/aroth-dashboard",
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "pill" | "rectangular" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              logo_alignment?: "left" | "center";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

export function GoogleAuthButton({
  mode,
  role,
  company,
  phone,
  address,
  districtId,
  hubId,
  ownerName,
  tradeLicense,
}: {
  mode: GoogleMode;
  role?: "buyer" | "seller";
  company?: string;
  phone?: string;
  address?: string;
  districtId?: string;
  hubId?: string;
  ownerName?: string;
  tradeLicense?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!scriptReady || !clientId || !window.google || !buttonRef.current) return;

    buttonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (!response.credential || busy) return;

        setBusy(true);
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              credential: response.credential,
              mode,
              role,
              company,
              phone,
              address,
              districtId,
              hubId,
              ownerName,
              tradeLicense,
            }),
          });

          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.message ?? "Google authentication failed");
          }

          toast.success(mode === "register" ? "Account created! Welcome to Paikari." : "Welcome back!");

          const activeRole = (json?.user?.activeRole ?? "buyer") as Role;
          const next = searchParams.get("next");
          router.replace(next ?? roleRedirects[activeRole]);
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Google authentication failed");
        } finally {
          setBusy(false);
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "left",
      width: Math.max(260, Math.floor(buttonRef.current.offsetWidth || 320)),
    });
  }, [
    address,
    busy,
    clientId,
    company,
    districtId,
    hubId,
    mode,
    ownerName,
    phone,
    role,
    router,
    scriptReady,
    searchParams,
    tradeLicense,
  ]);

  return (
    <div className="space-y-2">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      {clientId ? (
        <div ref={buttonRef} className={busy ? "pointer-events-none opacity-70" : ""} />
      ) : (
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 opacity-80"
        >
          <Chrome className="h-4 w-4" />
          Continue with Google
        </button>
      )}
      {!clientId && (
        <p className="text-center text-xs text-slate-400">
          Google login will appear after `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured.
        </p>
      )}
    </div>
  );
}
