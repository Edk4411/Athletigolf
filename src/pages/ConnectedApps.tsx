import { useEffect, useState } from "react";
import { PageHeader, Card, Button, StatusPill } from "@/components/ui";
import { useStrava } from "@/hooks/useStrava";
import { getStravaAuthorizeUrl } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { isNativeApp, openExternalBrowser } from "@/lib/nativeApp";

export default function ConnectedApps() {
  const { stravaConnection, loading, disconnect } = useStrava();
  const stravaHref = getStravaAuthorizeUrl();
  const [processing, setProcessing] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const provider = params.get("provider");
    const source = params.get("source");

    if (code) {
      handleCallback(code);
    } else if (provider === "strava" && source === "mobile" && !stravaConnection && stravaHref && !loading) {
      window.location.href = stravaHref;
    }
  }, [stravaConnection, stravaHref, loading]);

  async function handleCallback(code: string) {
    setProcessing(true);
    window.history.replaceState({}, document.title, window.location.pathname);
    await supabase.functions.invoke("strava-oauth", { body: { code } });
    navigate("/strava-callback");
    setProcessing(false);
  }

  function handleConnect() {
    if (isNativeApp() && stravaHref) {
      openExternalBrowser(window.location.origin + "/connected-apps?provider=strava&source=mobile");
    } else if (stravaHref) {
      window.location.href = stravaHref;
    }
  }

  const integrations = [
    {
      id: "strava",
      name: "Strava",
      description: "Import runs, walks and hikes from Strava.",
      isConnected: !!stravaConnection,
      onConnect: handleConnect,
      onDisconnect: disconnect,
    },
    { id: "garmin", name: "Garmin", description: "Coming soon", isConnected: false },
    { id: "apple", name: "Apple Health", description: "Coming soon", isConnected: false },
    { id: "trackman", name: "TrackMan", description: "Coming soon", isConnected: false },
    { id: "toptracer", name: "TopTracer", description: "Coming soon", isConnected: false },
  ];

  return (
    <div className="p-5 lg:p-10 min-h-screen bg-cream">
      <PageHeader
        eyebrow="Settings"
        title="Connected Apps"
        description="Connect external services to import activities and improve your experience. Your connected data always remains private to your account."
      />

      <div className="grid gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                   <span className="text-orange-600 font-bold">{integration.name[0]}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-dark">{integration.name}</h2>
                  <p className="text-sm text-muted">{integration.description}</p>
                </div>
              </div>
              {integration.isConnected ? (
                <StatusPill tone="golf">Connected ✓</StatusPill>
              ) : integration.id === "strava" ? (
                <StatusPill tone="neutral">Not connected</StatusPill>
              ) : (
                <StatusPill tone="neutral">Coming Soon</StatusPill>
              )}
            </div>
            
            <div className="flex gap-3 mt-2">
              {integration.isConnected ? (
                <Button variant="secondary" onClick={integration.onDisconnect} disabled={loading || processing}>
                  Disconnect
                </Button>
              ) : integration.id === "strava" ? (
                <Button variant="pulse" onClick={integration.onConnect} disabled={loading || processing}>
                  Connect {integration.name}
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  {integration.id === "strava" ? "Configure Strava API" : "Coming Soon"}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
