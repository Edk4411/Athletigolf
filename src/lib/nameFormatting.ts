import { Profile } from "./types";

export function getDisplayName(profile: Profile | undefined | null): string {
  if (!profile) return "Athlete";
  
  if (profile.preferred_name) return profile.preferred_name;
  if (profile.full_name) return profile.full_name.split(" ")[0];
  if (profile.username) return profile.username;
  
  return "Athlete";
}
