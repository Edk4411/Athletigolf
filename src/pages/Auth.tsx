import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button, FieldLabel, TextInput } from "@/components/ui";

export default function AuthPage() {
  const { signUp, signIn } = useAuth();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, username);
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-panel shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-dark p-8 text-white md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,166,200,0.28),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(65,87,216,0.24),transparent_38%)]" />
          <div className="relative">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-pulse">
              <ShieldCheck className="h-4 w-4" />
              AthletiGolf
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">
              Your golf and athletic performance in one place.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
              Track rounds, log training, and build the data layer for smarter progress.
            </p>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-3">
            {["Rounds", "Training", "Insights"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">Module</p>
                <p className="mt-2 font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-center p-8 md:p-12">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-lab">
            {isLogin ? "Sign in" : "Create account"}
          </p>
          <h2 className="mb-3 text-4xl font-semibold text-dark">
            {isLogin ? "Welcome back" : `Welcome ${username || ""}`}
          </h2>
          <p className="mb-8 text-muted">
            {isLogin ? "Open your command center and continue the work." : "Set up your profile and start tracking properly."}
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <FieldLabel>Username</FieldLabel>
                <TextInput
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                <button onClick={() => setIsLogin(false)} className="font-semibold text-dark hover:underline">
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setIsLogin(true)} className="font-semibold text-dark hover:underline">
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
