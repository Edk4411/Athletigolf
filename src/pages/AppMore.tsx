import { useEffect, useState } from "react";
import {
  ChevronRight,
  CreditCard,
  Instagram,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type MoreRowProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  trailingIcon?: React.ComponentType<{ className?: string }>;
  dot?: boolean;
  accent?: boolean;
  onClick: () => void;
};

export default function AppMore() {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const [role, setRole] = useState("user");

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("profiles")
      .select("role")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRole(data?.role || "user");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
  }

  return (
    <main className="min-h-screen bg-[#f3f6f8] pb-[calc(3rem+env(safe-area-inset-bottom))] text-[#101d2b] dark:bg-[#061321] dark:text-white">
      <div className="border-b border-black/5 bg-white dark:border-white/10 dark:bg-[#102437]">
        <MoreRow icon={User} label="Edit Profile" onClick={() => navigate("/profile")} />
      </div>

      <MoreSection title="App" />
      <div className="border-b border-black/5 bg-white dark:border-white/10 dark:bg-[#102437]">
        <MoreRow icon={Settings} label="Settings" onClick={() => navigate("/settings")} />
        <MoreRow icon={CreditCard} label="Memberships" detail="Plans and access" onClick={() => navigate("/memberships")} />
        <MoreRow icon={Instagram} label="Follow AthletiGolf" onClick={() => navigate("/follow")} />
      </div>

      <MoreSection title="Support" />
      <div className="border-b border-black/5 bg-white dark:border-white/10 dark:bg-[#102437]">
        <MoreRow icon={Mail} label="Contact Us" onClick={() => navigate("/contact")} />
        <MoreRow icon={ShieldCheck} label="Terms" onClick={() => navigate("/terms")} />
        <MoreRow icon={ShieldCheck} label="Privacy Policy" onClick={() => navigate("/privacy")} />
        {role === "admin" && <MoreRow icon={ShieldCheck} label="Admin feedback" detail="Tester notes" onClick={() => navigate("/admin/feedback")} />}
        <MoreRow icon={LogOut} label="Log Out" accent onClick={handleSignOut} />
      </div>

      <div className="px-6 pb-8 pt-8 text-center text-sm font-semibold text-black/35 dark:text-white/55">
        <p>AthletiGolf app preview</p>
        <button type="button" onClick={() => navigate("/terms")} className="mt-4 block w-full text-pulse underline dark:text-cyan-200">
          Terms of Use
        </button>
        <button type="button" onClick={() => navigate("/privacy")} className="mt-2 block w-full text-pulse underline dark:text-cyan-200">
          Privacy Policy
        </button>
      </div>
    </main>
  );
}

function MoreSection({ title }: { title: string }) {
  return (
    <div className="border-y border-black/5 bg-[#e9edf1] px-5 py-4 dark:border-white/10 dark:bg-[#0b1d2d]">
      <p className="text-lg font-black tracking-tight text-[#142231] dark:text-white">{title}</p>
    </div>
  );
}

function MoreRow({
  icon: Icon,
  label,
  detail,
  trailingIcon: TrailingIcon,
  dot = false,
  accent = false,
  onClick,
}: MoreRowProps) {
  const EndIcon = TrailingIcon || ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4.7rem] w-full items-center gap-5 border-b border-black/7 bg-white px-5 text-left transition active:bg-black/[0.03] dark:border-white/10 dark:bg-[#102437] dark:active:bg-white/10"
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center ${accent ? "text-pulse dark:text-cyan-200" : "text-[#142231] dark:text-white"}`}>
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[1.12rem] font-medium leading-tight tracking-wide ${accent ? "text-pulse dark:text-cyan-200" : "text-[#142231] dark:text-white"}`}>
          {label}
        </span>
        {detail && <span className="mt-1 block truncate text-sm text-black/48 dark:text-white/65">{detail}</span>}
      </span>
      {dot && <span className="mr-2 h-4 w-4 shrink-0 rounded-full bg-danger" />}
      <EndIcon className="h-6 w-6 shrink-0 text-[#142231] dark:text-white/75" />
    </button>
  );
}
