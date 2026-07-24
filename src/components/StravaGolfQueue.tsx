import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { MapPin } from "lucide-react";

type StravaGolfActivity = {
  id: string;
  activity_date: string;
  activity_type: string;
  distance_km: number;
};

export function StravaGolfQueue() {
  const [activities, setActivities] = useState<StravaGolfActivity[]>([]);

  useEffect(() => {
    async function fetchActivities() {
      const { data, error } = await supabase.functions.invoke("strava-process-golf", {
        body: { action: "fetch" },
      });
      if (!error && data) {
        setActivities(data);
      }
    }
    fetchActivities();
  }, []);

  if (activities.length === 0) return null;

  return (
    <Card className="border-gold/30 bg-gold/5 dark:bg-[#2b2512]">
      <h3 className="text-md font-semibold text-dark dark:text-gold">Strava Golf Activities Found</h3>
      <p className="mt-1 text-sm text-muted dark:text-white/60">
        We found {activities.length} activity{activities.length > 1 ? "s" : ""} from Strava that look like golf. Would you like to link them to rounds?
      </p>
      <div className="mt-4 space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/50 p-3 dark:bg-[#362f1a]">
            <div className="flex items-center gap-2 text-sm text-dark dark:text-white">
              <MapPin className="h-4 w-4 text-gold" />
              {activity.activity_date} - {activity.activity_type}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">Link to Round</Button>
              <Button variant="ghost">Ignore</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
