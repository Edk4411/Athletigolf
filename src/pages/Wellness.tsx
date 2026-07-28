import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Bed, ChevronLeft, Droplets, Gauge, HeartPulse, Scale, Utensils, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type WellnessLog, type WellnessTrackingPreferences } from "@/lib/types";
import { defaultWellnessTracking, getWellnessTracking } from "@/lib/wellnessTargets";

const todayIso = () => new Date().toISOString().split("T")[0];

const formatNumber = (value: number | null | undefined) => value?.toString() ?? "-";
const formatLitres = (value: number | null | undefined) => (value ? `${value.toFixed(1)} L` : "-");
const formatHours = (value: number | null | undefined) => (value ? `${value} h` : "-");

export default function Wellness() {
  const [todayLog, setTodayLog] = useState<WellnessLog | null>(null);
  const [tracking, setTracking] = useState<WellnessTrackingPreferences>(defaultWellnessTracking);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [
      { data: profile },
      { data: log }
    ] = await Promise.all([
      supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle(),
      supabase
        .from("daily_wellness_logs")
        .select("*")
        .eq("log_date", todayIso())
        .maybeSingle(),
    ]);

    const onboarding = profile?.onboarding_data as any;
    setTracking(getWellnessTracking(onboarding));
    setTodayLog(log);
    setLoading(false);
  }

  const cards = useMemo(
    () =>
      [
        { key: "food", icon: Utensils, title: "Food", path: "/wellness/food", enabled: tracking.food, value: todayLog?.calories ? `${todayLog.calories} kcal` : "-" },
        { key: "water", icon: Droplets, title: "Water", path: "/wellness/water", enabled: tracking.water, value: todayLog?.water_litres ? formatLitres(todayLog.water_litres) : "-" },
        { key: "sleep", icon: Bed, title: "Sleep", path: "/wellness/sleep", enabled: tracking.sleep, value: todayLog?.sleep_hours ? formatHours(todayLog.sleep_hours) : "-" },
        { key: "body", icon: Scale, title: "Body composition", path: "/wellness/body", enabled: tracking.body, value: todayLog?.bodyweight ? `${todayLog.bodyweight} kg` : "-" },
        { key: "bloodPressure", icon: Gauge, title: "Blood pressure", path: "/wellness/bloodpressure", enabled: tracking.bloodPressure, value: todayLog?.blood_pressure_systolic && todayLog?.blood_pressure_diastolic ? `${todayLog.blood_pressure_systolic}/${todayLog.blood_pressure_diastolic}` : "-" },
        { key: "heartRate", icon: HeartPulse, title: "Heart rate", path: "/wellness/heartrate", enabled: tracking.heartRate, value: todayLog?.resting_heart_rate ? `${todayLog.resting_heart_rate} bpm` : "-" },
      ].filter((card) => card.enabled),
    [todayLog, tracking]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading wellness dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b] md:px-8 md:py-7">
      <section className="mb-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#101d2b] shadow-sm"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pulse">Wellness</p>
            <h1 className="text-3xl font-black tracking-tight text-[#101d2b]">Overview</h1>
          </div>
          <span className="h-12 w-12" aria-hidden="true" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.key} href={card.path} className="rounded-[2rem] bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="mb-4 flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pulse/10 text-pulse">
                <card.icon className="h-6 w-6" />
              </span>
              <h2 className="text-xl font-black text-[#101d2b]">{card.title}</h2>
            </div>
            <p className="text-4xl font-black text-[#101d2b]">{card.value}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
