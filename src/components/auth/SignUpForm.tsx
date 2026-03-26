"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUpSchema, SignUpFormData as FormData } from "@/lib/schemas";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

type DistrictOption = {
  id: string;
  name: string;
};

type HubOption = {
  id: string;
  name: string;
  location: string | null;
  type: string | null;
};

export function SignUpForm() {
  const router = useRouter();
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [hubOptions, setHubOptions] = useState<HubOption[]>([]);
  const [hubsLoading, setHubsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(signUpSchema) as any,
    defaultValues: {
      accountType: "buyer",
      email: "",
      phone: "",
      address: "",
      districtId: "",
      hubId: "",
      ownerName: "",
      tradeLicense: "",
    },
  });

  const selectedType = watch("accountType");
  const company = watch("company");
  const phone = watch("phone");
  const address = watch("address");
  const districtId = watch("districtId");
  const hubId = watch("hubId");
  const ownerName = watch("ownerName");
  const tradeLicense = watch("tradeLicense");

  useEffect(() => {
    fetch("/api/districts")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load districts"))))
      .then((data: { districts?: DistrictOption[] }) => {
        setDistrictOptions(data.districts ?? []);
      })
      .catch(() => {
        setDistrictOptions([]);
        toast.error("District list could not be loaded.");
      })
      .finally(() => setDistrictsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/hubs")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load hubs"))))
      .then((data: { hubs?: HubOption[] }) => {
        setHubOptions(data.hubs ?? []);
      })
      .catch(() => {
        setHubOptions([]);
        toast.error("Hub list could not be loaded.");
      })
      .finally(() => setHubsLoading(false));
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.company,
          email: data.email || undefined,
          phone: data.phone || undefined,
          address: data.address || undefined,
          districtId: data.districtId,
          hubId: data.accountType === "seller" ? data.hubId || undefined : undefined,
          ownerName: data.accountType === "seller" ? data.ownerName || undefined : undefined,
          tradeLicense: data.accountType === "seller" ? data.tradeLicense || undefined : undefined,
          password: data.password,
          role: data.accountType,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.message ?? "Registration failed.");
        return;
      }

      toast.success("Registration submitted! Your account is pending admin approval.");
      router.push("/auth/signin?pending=1");
    } catch {
      toast.error("Registration failed. Please try again.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">Account type</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-2xl border bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40 ${
            selectedType === "buyer" ? "border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-100" : "border-slate-200"
          }`}>
            <input type="radio" value="buyer" {...register("accountType")} className="sr-only" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Buyer account</p>
              <p className="text-xs leading-snug text-slate-500">Join auctions, place orders, and manage wallet payments.</p>
            </div>
          </label>
          <label className={`cursor-pointer rounded-2xl border bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40 ${
            selectedType === "seller" ? "border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-100" : "border-slate-200"
          }`}>
            <input type="radio" value="seller" {...register("accountType")} className="sr-only" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Seller account</p>
              <p className="text-xs leading-snug text-slate-500">List products, manage lots, and receive withdrawal requests.</p>
            </div>
          </label>
        </div>
        {errors.accountType && (
          <p className="text-xs text-rose-500">{errors.accountType.message}</p>
        )}
      </div>

      <GoogleAuthButton
        mode="register"
        role={selectedType}
        company={company}
        phone={phone}
        address={address}
        districtId={districtId}
        hubId={selectedType === "seller" ? hubId : undefined}
        ownerName={selectedType === "seller" ? ownerName : undefined}
        tradeLicense={selectedType === "seller" ? tradeLicense : undefined}
      />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">or continue with email or mobile</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-800" htmlFor="company">
          Business name
        </label>
        <input
          id="company"
          type="text"
          placeholder="Company LLC"
          {...register("company")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
        />
        {errors.company && (
          <p className="text-xs text-rose-500">{errors.company.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Use email, mobile number, or both
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              {...register("email")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
            />
            {errors.email && (
              <p className="text-xs text-rose-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="phone">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="017XXXXXXXX"
              {...register("phone")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
            />
            {errors.phone && (
              <p className="text-xs text-rose-500">{errors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-semibold text-slate-800" htmlFor="address">
            Address
          </label>
          <input
            id="address"
            type="text"
            placeholder="House, road, market, or area"
            {...register("address")}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
          />
          {errors.address && (
            <p className="text-xs text-rose-500">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-800" htmlFor="districtId">
            District
          </label>
          <select
            id="districtId"
            {...register("districtId")}
            disabled={districtsLoading || districtOptions.length === 0}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
          >
            <option value="">
              {districtsLoading ? "Loading districts..." : districtOptions.length > 0 ? "Select district" : "No districts available"}
            </option>
            {districtOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {errors.districtId && (
            <p className="text-xs text-rose-500">{errors.districtId.message}</p>
          )}
        </div>
      </div>

      {selectedType === "seller" && (
        <div className="space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Seller details</p>
            <p className="text-xs text-slate-500">Add the business contact details we should use for your seller account.</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="hubId">
              Hub
            </label>
            <select
              id="hubId"
              {...register("hubId")}
              disabled={hubsLoading || hubOptions.length === 0}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
            >
              <option value="">
                {hubsLoading ? "Loading hubs..." : hubOptions.length > 0 ? "Select hub" : "No hubs available"}
              </option>
              {hubOptions.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.name}{hub.location ? ` — ${hub.location}` : ""}
                </option>
              ))}
            </select>
            {errors.hubId && (
              <p className="text-xs text-rose-500">{errors.hubId.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800" htmlFor="ownerName">
                Owner / contact name
              </label>
              <input
                id="ownerName"
                type="text"
                placeholder="Md. Abdullah"
                {...register("ownerName")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
              />
              {errors.ownerName && (
                <p className="text-xs text-rose-500">{errors.ownerName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800" htmlFor="tradeLicense">
                Trade license
              </label>
              <input
                id="tradeLicense"
                type="text"
                placeholder="Trade license number"
                {...register("tradeLicense")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
              />
              {errors.tradeLicense && (
                <p className="text-xs text-rose-500">{errors.tradeLicense.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-800" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
          />
          {errors.password && (
            <p className="text-xs text-rose-500">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-800" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            placeholder="••••••••"
            {...register("confirm")}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-100 focus:ring-2"
          />
          {errors.confirm && (
            <p className="text-xs text-rose-500">{errors.confirm.message}</p>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600">
        By creating an account you agree to our{" "}
        <a href="/terms" className="font-semibold text-emerald-700 underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-semibold text-emerald-700 underline">
          Privacy Policy
        </a>
        .
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
