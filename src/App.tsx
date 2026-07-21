import { useEffect, useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import MobileSidebar from "@/components/MobileSidebar";
import AppDock from "@/components/AppDock";
import AppHeader from "@/components/AppHeader";
import AuthPage from "@/pages/Auth";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import Analytics from "@/pages/Analytics";
import AthletiAI from "@/pages/AthletiAI";
import Wellness from "@/pages/Wellness";
import Social from "@/pages/Social";
import FriendProfile from "@/pages/FriendProfile";
import GolfHub from "@/pages/GolfHub";
import GymHub from "@/pages/GymHub";
import RoundHistory from "@/pages/RoundHistory";
import Competitions from "@/pages/Competitions";
import ArchivedSplits from "@/pages/ArchivedSplits";
import CreateSplit from "@/pages/CreateSplit";
import SubmitSession from "@/pages/SubmitSession";
import ExerciseDetail from "@/pages/ExerciseDetail";
import ExerciseLibrary from "@/pages/ExerciseLibrary";
import Cardio from "@/pages/Cardio";
import GymQuiz from "@/pages/GymQuiz";
import GolfQuiz from "@/pages/GolfQuiz";
import RoundTracker from "@/pages/RoundTracker";
import LiveRound from "@/pages/LiveRound";
import ComingSoon from "@/pages/ComingSoon";
import AppIntro from "@/pages/AppIntro";
import AppMore from "@/pages/AppMore";
import { applyTextAutoFormatToField } from "@/lib/textFormatting";
import { isNativeApp } from "@/lib/nativeApp";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import { getFallbackRouteForSportMode, isRouteAllowedForSportMode } from "@/lib/sportMode";
import type { OnboardingData } from "@/lib/types";
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
  if (!user) return <Redirect to="/app-intro" />;
  return <>{children}</>;
}

function AppShell() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [sportMode, setSportMode] = useState<OnboardingData["mainSport"]>("both");
  const [profileReady, setProfileReady] = useState(false);
  const hideSidebar = location === "/" || location === "/auth" || location === "/onboarding" || location === "/app-intro";
  const nativeApp = isNativeApp();
  const showAppDock = nativeApp && !hideSidebar;

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
    setProfileReady(!user);
    if (!user || location === "/auth" || location === "/" || location === "/onboarding" || location === "/privacy" || location === "/terms") return;

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
          setProfileReady(true);
          return;
        }
        const onboarding = (data.onboarding_data as OnboardingData | null) || null;
        const nextSportMode = onboarding?.mainSport || "both";
        setSportMode(nextSportMode);
        setProfileReady(true);
        if (!isRouteAllowedForSportMode(location, nextSportMode)) {
          navigate(getFallbackRouteForSportMode(nextSportMode));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, navigate, user]);

  const guarded = (children: React.ReactNode) => (
    <ProtectedRoute>
      {profileReady ? children : (
        <div className="flex min-h-screen items-center justify-center bg-cream">
          <div className="text-lg text-muted">Loading...</div>
        </div>
      )}
    </ProtectedRoute>
  );

 return (
  <div
    className={`min-h-screen bg-cream font-sans text-ink ${nativeApp ? "native-app" : ""}`}
    onBlurCapture={(event) => applyTextAutoFormatToField(event.target)}
  >
    {!hideSidebar && !nativeApp && <MobileSidebar />}
    {showAppDock && <AppHeader />}
    <div
      className={
        hideSidebar
          ? ""
          : nativeApp
          ? "min-h-screen pt-[calc(5.25rem+env(safe-area-inset-top))] pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
          : "min-h-screen pt-20 lg:pl-72"
      }
    >
      <Switch>
      <Route path="/coming-soon">
        <ComingSoon />
      </Route>

      <Route path="/" component={AppIntro} />
      <Route path="/app-intro" component={AppIntro} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />

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

        <Route path="/social/friends/:friendId">
          <ProtectedRoute>
            <FriendProfile />
          </ProtectedRoute>
        </Route>

        <Route path="/activity/golf">
          <ProtectedRoute>
            <GolfHub />
          </ProtectedRoute>
        </Route>

        <Route path="/activity/gym">
          <ProtectedRoute>
            <GymHub />
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

        <Route path="/golf/rounds/:roundId">
          <ProtectedRoute>
            <LiveRound />
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

        <Route path="/fitness/cardio">
          <ProtectedRoute>
            <Cardio />
          </ProtectedRoute>
        </Route>

        <Route path="/exercises">
          <ProtectedRoute>
            <ExerciseLibrary />
          </ProtectedRoute>
        </Route>

        <Route path="/exercises/:slug">
          <ProtectedRoute>
            <ExerciseDetail />
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

<Route path="/more">
  <ProtectedRoute>
    <AppMore />
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
    {showAppDock && <AppDock />}
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
