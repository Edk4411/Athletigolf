// Preferred / friendly name helpers.
// Rule: username is only used for search & add-friend. Everywhere else, show
// preferred_name -> first word of full_name -> display_name -> "Athlete".

export type NamedProfile = {
  preferred_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  username?: string | null;
};

export function getPreferredName(profile: NamedProfile | null | undefined, fallback = "Athlete") {
  if (!profile) return fallback;
  const preferred = profile.preferred_name?.trim();
  if (preferred) return preferred;
  const full = profile.full_name?.trim();
  if (full) return full.split(/\s+/)[0];
  const display = profile.display_name?.trim();
  if (display) return display;
  return fallback;
}

export function getFriendDisplayName(
  profile: NamedProfile & { nickname?: string | null } | null | undefined,
  fallback = "Friend"
) {
  if (!profile) return fallback;
  const nickname = profile.nickname?.trim();
  if (nickname) return nickname;
  return getPreferredName(profile, fallback);
}
