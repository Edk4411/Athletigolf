import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button, FieldLabel, TextInput } from "@/components/ui";
import { isValidUsername, normalizeUsername, usernameRules } from "@/lib/usernames";
import { isNativeApp } from "@/lib/nativeApp";
import { cn } from "@/lib/utils";
import athletiGolfLogo from "@/assets/athletigolf-logo-transparent.png";

export default function AuthPage() {
  const { user, signUp, signIn } = useAuth();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const nativeApp = isNativeApp();

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const errorDescription = params.get("error_description");
    if (errorDescription) {
      setError(errorDescription);
      return;
    }
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        navigate(data?.onboarding_completed ? "/dashboard" : "/onboarding");
      });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error("Enter a valid email address.");
      }

      if (isLogin) {
        await signIn(cleanEmail, password);
        navigate("/dashboard");
      } else {
        const cleanUsername = normalizeUsername(username);
        if (!isValidUsername(cleanUsername)) {
          throw new Error(usernameRules);
        }
        await signUp(cleanEmail, password, cleanUsername);
        setNotice("Check your email to verify your account, then come back and sign in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-cream px-4 py-8", nativeApp && "bg-[#061526]")}>
      <div className={cn(
        "grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_30px_90px_rgba(11,17,23,0.16)] lg:grid-cols-[1.05fr_0.95fr]",
        nativeApp && "max-w-md border-white/10 bg-white/[0.08] text-white backdrop-blur-xl lg:grid-cols-1"
      )}>
        <section className={cn("relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-dark p-8 text-white md:p-12", nativeApp && "hidden")}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(19,200,203,0.34),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(215,180,90,0.18),transparent_34%),linear-gradient(135deg,#070a0f_0%,#101922_55%,#040608_100%)]" />
          <div className="relative">
            <div className="mb-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-pulse">
              <img
                src={athletiGolfLogo}
                alt=""
                className="h-7 w-7 object-contain"
                aria-hidden="true"
              />
              AthletiGolf
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">
              A performance app that adapts to your sport, training and goals.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
              Track what matters, then use the data to make better decisions.
            </p>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-3">
            {["Rounds", "Training", "Insights"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">Module</p>
                <p className="mt-2 font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={cn("flex flex-col justify-center p-8 md:p-12", nativeApp && "min-h-screen px-6 py-[calc(2rem+env(safe-area-inset-top))]")}>
          <div className={cn("mb-8 hidden text-center", nativeApp && "block")}>
            <img src={athletiGolfLogo} alt="" className="mx-auto h-20 w-20 object-contain" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-pulse">AthletiGolf</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Train, play, recover, improve. Your way.</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/62">
              A performance app that adapts to your sport, training and goals.
            </p>
          </div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-lab">
            {isLogin ? "Sign in" : "Create account"}
          </p>
          <h2 className={cn("mb-3 text-4xl font-semibold text-dark", nativeApp && "text-white")}>
            {isLogin ? "Welcome back" : `Welcome ${username || ""}`}
          </h2>
          <p className={cn("mb-8 text-muted", nativeApp && "text-white/62")}>
            {isLogin ? "Open your performance system and keep moving." : "Create your account, verify your email and start building your setup."}
          </p>

          {notice && (
            <div className={cn("mb-6 flex gap-3 rounded-2xl border border-pulse/25 bg-pulse/10 px-4 py-3 text-sm text-dark", nativeApp && "text-white")}>
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pulse" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-5 grid gap-3">
            <button
              type="button"
              disabled
              className={cn("inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-dark opacity-70", nativeApp && "border-white/10 bg-white/10 text-white")}
            >
              <Mail className="h-4 w-4" />
              Continue with email
            </button>
            <div className="grid grid-cols-2 gap-3">
              {["Google", "Apple"].map((provider) => (
                <button
                  type="button"
                  key={provider}
                  disabled
                  className={cn("min-h-11 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-dark opacity-45", nativeApp && "border-white/10 bg-white/8 text-white")}
                >
                  {provider}
                </button>
              ))}
            </div>
            <p className={cn("text-center text-[11px] text-muted", nativeApp && "text-white/45")}>Social sign-in coming soon.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <FieldLabel>Username</FieldLabel>
                <TextInput
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  required
                />
                <p className="mt-2 text-xs text-muted">{usernameRules}</p>
              </div>
            )}

            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
              />
            </div>

            <div>
              <FieldLabel>Password</FieldLabel>
              <TextInput
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="pulse"
              className="w-full"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 text-center text-muted">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={() => { setIsLogin(false); setError(""); setNotice(""); }} className={cn("font-semibold text-dark hover:underline", nativeApp && "text-pulse")}>
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => { setIsLogin(true); setError(""); }} className={cn("font-semibold text-dark hover:underline", nativeApp && "text-pulse")}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
