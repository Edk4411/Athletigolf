import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import MobileSidebar from "@/components/MobileSidebar";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import Analytics from "@/pages/Analytics";
import AthletiAI from "@/pages/AthletiAI";
import Wellness from "@/pages/Wellness";
import Social from "@/pages/Social";
import RoundHistory from "@/pages/RoundHistory";
import Competitions from "@/pages/Competitions";
import ArchivedSplits from "@/pages/ArchivedSplits";
import CreateSplit from "@/pages/CreateSplit";
import SubmitSession from "@/pages/SubmitSession";
import GymQuiz from "@/pages/GymQuiz";
import GolfQuiz from "@/pages/GolfQuiz";
import RoundTracker from "@/pages/RoundTracker";
import ComingSoon from "@/pages/ComingSoon";
import { applyTextAutoFormatToField } from "@/lib/textFormatting";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import PracticeSession from "./pages/PracticeSession";
import PracticePlan from "./pages/PracticePlan";
import PracticeHistory from "./pages/PracticeHistory";
import PreviousWorkouts from "./pages/PreviousWorkouts";
import Memberships from "./pages/Memberships";
import Settings from "./pages/Settings";
import Contact from "./pages/Contact";
import Follow from "./pages/Follow";
import AdminFeedback from "./pages/AdminFeedback";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-black/40 text-lg">Loading...</div>
      </div>
    );
  }
  if (!user) return <Redirect to="/auth" />;
  return <>{children}</>;
}

function AppShell() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const hideSidebar = location === "/" || location === "/auth" || location === "/onboarding";

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    supabase
      .from("profiles")
      .select("theme")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) applyTheme(data?.theme || getStoredTheme());
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || location === "/auth" || location === "/" || location === "/onboarding") return;

    let cancelled = false;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data || data.onboarding_completed !== true) {
          navigate("/onboarding");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, navigate, user]);

 return (
  <div
    className="min-h-screen bg-cream font-sans text-ink"
    onBlurCapture={(event) => applyTextAutoFormatToField(event.target)}
  >
    {!hideSidebar && <MobileSidebar />}
    <div className={!hideSidebar ? "min-h-screen pt-20 lg:pl-72" : ""}>
      <Switch>
      <Route path="/coming-soon">
        <ComingSoon />
      </Route>

      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />

      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>

        <Route path="/analytics">
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        </Route>

        <Route path="/athletiai">
          <ProtectedRoute>
            <AthletiAI />
          </ProtectedRoute>
        </Route>

        <Route path="/wellness">
          <ProtectedRoute>
            <Wellness />
          </ProtectedRoute>
        </Route>

        <Route path="/social">
          <ProtectedRoute>
            <Social />
          </ProtectedRoute>
        </Route>

        <Route path="/golf">
          <ProtectedRoute>
            <RoundHistory />
          </ProtectedRoute>
        </Route>

        <Route path="/golf/competitions">
          <ProtectedRoute>
            <Competitions />
          </ProtectedRoute>
        </Route>

        <Route path="/golf/submit">
          <ProtectedRoute>
            <RoundTracker />
          </ProtectedRoute>
        </Route>

        <Route path="/workouts">
          <ProtectedRoute>
            <CreateSplit />
          </ProtectedRoute>
        </Route>

        <Route path="/workouts/archive">
          <ProtectedRoute>
            <ArchivedSplits />
          </ProtectedRoute>
        </Route>

<Route path="/gym/history">
  <ProtectedRoute>
    <PreviousWorkouts />
  </ProtectedRoute>
</Route>

        <Route path="/workouts/submit">
          <ProtectedRoute>
            <SubmitSession />
          </ProtectedRoute>
        </Route>

        <Route path="/setup/gym">
          <ProtectedRoute>
            <GymQuiz onComplete={() => navigate("/dashboard")} />
          </ProtectedRoute>
        </Route>

        <Route path="/golf/practice">
          <ProtectedRoute>
            <PracticeSession />
          </ProtectedRoute>
        </Route>

        <Route path="/golf/practice-plan">
          <ProtectedRoute>
            <PracticePlan />
          </ProtectedRoute>
        </Route>

        <Route path="/golf/practice-history">
          <ProtectedRoute>
            <PracticeHistory />
          </ProtectedRoute>
        </Route>

        <Route path="/setup/golf">
          <ProtectedRoute>
            <GolfQuiz onComplete={() => navigate("/dashboard")} />
          </ProtectedRoute>
        </Route>

<Route path="/memberships">
  <ProtectedRoute>
    <Memberships />
  </ProtectedRoute>
</Route>


<Route path="/settings">
  <ProtectedRoute>
    <Settings />
  </ProtectedRoute>
</Route>

<Route path="/contact">
  <ProtectedRoute>
    <Contact />
  </ProtectedRoute>
</Route>

<Route path="/admin/feedback">
  <ProtectedRoute>
    <AdminFeedback />
  </ProtectedRoute>
</Route>

<Route path="/follow">
  <ProtectedRoute>
    <Follow />
  </ProtectedRoute>
</Route>

        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
