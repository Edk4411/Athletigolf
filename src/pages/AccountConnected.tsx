import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui";

export default function AccountConnected() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to auth if user tries to navigate away via back button
    const handlePopState = () => {
      navigate("/auth");
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-dark">Account Connected</h1>
        <p className="mt-4 text-muted leading-relaxed">
          Your account has been connected successfully.
          <br />
          Please refresh your app to continue.
        </p>
        <div className="mt-6">
          <Button 
            className="w-full" 
            onClick={() => navigate("/auth")}
          >
            Continue to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
