import {
  ensureAnonymousSession,
  firebaseConfigured,
  readCurrentFirebaseSession,
  signInWithEmailPassword,
} from "./firebase";
import {
  createFirebaseDocument,
  deleteFirebaseDocument,
  getFirebaseDocument,
  listFirebaseCollection,
  putFirebaseDocument,
} from "./firestoreRest";
import type {
  BadgeName,
  ContributionStats,
  UserProfile,
  XpAction,
  XpEvent,
} from "./types";
import { makeId } from "./utils";

const PROFILE_KEY = "nagarlens_profiles_v1";
const XP_KEY = "nagarlens_xp_events_v1";
const USER_KEY = "nagarlens_current_user_id_v1";
const PROFILE_EVENT = "nagarlens:profiles-updated";
const RESERVED_USERNAMES = new Set(["admin", "support", "google", "firebase", "system", "null", "undefined", "nagar", "nagarlens"]);


const emptyStats: ContributionStats = {
  issuesReported: 0,
  issuesResolved: 0,
  resolutionEvidence: 0,
  communityValidations: 0,
  duplicateFinds: 0,
  impactCreated: 0,
};

const sampleProfiles: UserProfile[] = [
  createSampleProfile("hero_aisha", "Aisha Verma", 2840, "Lucknow", "Lucknow", "Uttar Pradesh", {
    issuesReported: 48,
    issuesResolved: 31,
    resolutionEvidence: 27,
    communityValidations: 192,
    duplicateFinds: 16,
    impactCreated: 836,
  }, "Urban planner and weekend civic volunteer."),
  createSampleProfile("hero_arjun", "Arjun Mehta", 2130, "Lucknow", "Lucknow", "Uttar Pradesh", {
    issuesReported: 39,
    issuesResolved: 22,
    resolutionEvidence: 18,
    communityValidations: 155,
    duplicateFinds: 21,
    impactCreated: 612,
  }, "Uses data and photographs to make local follow-ups stronger."),
  createSampleProfile("hero_fatima", "Fatima Khan", 1680, "Kanpur", "Kanpur Nagar", "Uttar Pradesh", {
    issuesReported: 34,
    issuesResolved: 19,
    resolutionEvidence: 16,
    communityValidations: 118,
    duplicateFinds: 12,
    impactCreated: 501,
  }, "Community volunteer focused on safer streets and sanitation."),
  createSampleProfile("hero_rohan", "Rohan Iyer", 1160, "Pune", "Pune", "Maharashtra", {
    issuesReported: 24,
    issuesResolved: 15,
    resolutionEvidence: 12,
    communityValidations: 83,
    duplicateFinds: 9,
    impactCreated: 389,
  }, "Citizen mapper helping neighbourhoods document problems clearly."),
  createSampleProfile("hero_meera", "Meera Das", 760, "Kolkata", "Kolkata", "West Bengal", {
    issuesReported: 18,
    issuesResolved: 8,
    resolutionEvidence: 9,
    communityValidations: 61,
    duplicateFinds: 7,
    impactCreated: 238,
  }, "Student volunteer interested in clean and accessible public spaces."),
];

function createSampleProfile(
  id: string,
  displayName: string,
  xp: number,
  city: string,
  district: string,
  state: string,
  stats: ContributionStats,
  about: string,
): UserProfile {
  const now = new Date(Date.now() - xp * 30_000).toISOString();
  return {
    id,
    displayName,
    username: normalizeUsername(displayName) || id.replace(/^hero_/, ""),
    profileComplete: true,
    authProvider: "guest",
    about,
    city,
    district,
    state,
    country: "India",
    xp,
    badge: badgeForXp(xp),
    stats,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeProfile(profile: UserProfile): UserProfile {
  const stats = { ...emptyStats, ...(profile.stats || {}) };
  return {
    ...profile,
    displayName: profile.displayName || "Nagar Citizen",
    username: profile.username || normalizeUsername(profile.displayName || profile.id) || "",
    profileComplete: Boolean(profile.profileComplete),
    authProvider: profile.authProvider || readCurrentFirebaseSession()?.provider || "guest",
    about: profile.about || "Helping make neighbourhoods safer and better.",
    city: profile.city || "Lucknow",
    district: profile.district || profile.city || "Lucknow",
    state: profile.state || "Uttar Pradesh",
    country: profile.country || "India",
    xp: Number(profile.xp || 0),
    badge: badgeForXp(Number(profile.xp || 0)),
    stats,
  };
}

function normalizeUsername(value: string | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

function validateUsername(username: string): void {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username must be 3–20 characters using lowercase letters, numbers or underscore only.");
  }
  if (RESERVED_USERNAMES.has(username)) {
    throw new Error("This username is reserved. Choose another one.");
  }
}

async function reserveUsername(
  username: string,
  userId: string,
  oldUsername?: string,
): Promise<void> {
  if (!firebaseConfigured) {
    const existing = readLocalProfiles().find(
      (profile) =>
        profile.username === username &&
        profile.id !== userId,
    );

    if (existing) {
      throw new Error("This username is already taken.");
    }

    return;
  }

  const allProfiles =
    await listFirebaseCollection<UserProfile>("profiles", {
      pageSize: 200,
    });

  const profileUsingUsername = allProfiles.find(
    (profile) =>
      normalizeUsername(profile.username) === username &&
      profile.id !== userId,
  );

  if (profileUsingUsername) {
    throw new Error("This username is already taken.");
  }

  const existingReservation =
    await getFirebaseDocument<{ userId: string }>(
      `usernames/${username}`,
    );

  if (
    existingReservation &&
    existingReservation.userId !== userId
  ) {
    throw new Error("This username is already taken.");
  }

  if (!existingReservation) {
    const created = await createFirebaseDocument(
      "usernames",
      username,
      {
        userId,
        username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );

    if (!created) {
      const latest =
        await getFirebaseDocument<{ userId: string }>(
          `usernames/${username}`,
        );

      if (!latest || latest.userId !== userId) {
        throw new Error("This username is already taken.");
      }
    }
  } else {
    await putFirebaseDocument(`usernames/${username}`, {
      ...existingReservation,
      userId,
      username,
      updatedAt: new Date().toISOString(),
    });
  }

  if (oldUsername && oldUsername !== username) {
    await deleteFirebaseDocument(
      `usernames/${oldUsername}`,
    ).catch(() => undefined);
  }
}

export function suggestedUsername(displayName: string): string {
  const base = normalizeUsername(displayName) || "nagar_citizen";
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base}_${suffix}`.slice(0, 20);
}

function readLocalProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(sampleProfiles));
      return sampleProfiles;
    }
    const parsed = (JSON.parse(raw) as UserProfile[]).map(normalizeProfile);
    const ids = new Set(parsed.map((item) => item.id));
    const merged = [...parsed, ...sampleProfiles.filter((item) => !ids.has(item.id))];
    if (merged.length !== parsed.length) localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return sampleProfiles;
  }
}

function writeLocalProfiles(profiles: UserProfile[]): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
}

function readLocalEvents(): XpEvent[] {
  try {
    return JSON.parse(localStorage.getItem(XP_KEY) || "[]") as XpEvent[];
  } catch {
    return [];
  }
}

function writeLocalEvents(events: XpEvent[]): void {
  localStorage.setItem(XP_KEY, JSON.stringify(events));
}

async function resolveCurrentUserId(): Promise<string> {
  if (firebaseConfigured) {
    const session = await ensureAnonymousSession();
    return session.localId;
  }
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = makeId("citizen");
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export async function ensureCurrentProfile(): Promise<UserProfile> {
  const id = await resolveCurrentUserId();
  const existing = await getProfile(id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const profile: UserProfile = {
    id,
    displayName: "Nagar Citizen",
    username: "",
    profileComplete: false,
    authProvider: readCurrentFirebaseSession()?.provider || "guest",
    about: "I report and verify local civic issues to help my community.",
    city: "",
    district: "",
    state: "",
    country: "India",
    xp: 0,
    badge: "Civic Starter",
    stats: { ...emptyStats },
    createdAt: now,
    updatedAt: now,
  };
  await saveProfile(profile);
  return profile;
}

export async function getProfile(id: string): Promise<UserProfile | null> {
  if (!firebaseConfigured) {
    return readLocalProfiles().find((profile) => profile.id === id) ?? null;
  }
  const profile = await getFirebaseDocument<UserProfile>(`profiles/${id}`);
  return profile ? normalizeProfile(profile) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const normalized = normalizeProfile({ ...profile, updatedAt: new Date().toISOString() });
  if (!firebaseConfigured) {
    const profiles = readLocalProfiles();
    writeLocalProfiles([normalized, ...profiles.filter((item) => item.id !== profile.id)]);
    return;
  }
  await putFirebaseDocument(`profiles/${profile.id}`, normalized);
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
}

export async function updateCurrentProfile(
  changes: Pick<UserProfile, "displayName" | "username" | "about" | "city" | "district" | "state">,
): Promise<UserProfile> {
  const current = await ensureCurrentProfile();
  const username = normalizeUsername(changes.username);
  validateUsername(username);

  await reserveUsername(
  username,
  current.id,
  current.username || undefined,
);

  const updated = normalizeProfile({
    ...current,
    ...changes,
    username,
    profileComplete: true,
    updatedAt: new Date().toISOString(),
  });
  await saveProfile(updated);
  return updated;
}

export async function startEmailAuthProfile(
  email: string,
  password: string,
  mode: "signin" | "signup",
): Promise<UserProfile> {
  await signInWithEmailPassword(email, password, mode);
  return ensureCurrentProfile();
}

export function subscribeProfiles(callback: (profiles: UserProfile[]) => void): () => void {
  if (!firebaseConfigured) {
    const emit = () => callback(readLocalProfiles().sort((a, b) => b.xp - a.xp));
    emit();
    window.addEventListener(PROFILE_EVENT, emit);
    window.addEventListener("storage", emit);
    return () => {
      window.removeEventListener(PROFILE_EVENT, emit);
      window.removeEventListener("storage", emit);
    };
  }

  let stopped = false;
  const load = async () => {
    try {
      const cloudProfiles = await listFirebaseCollection<UserProfile>("profiles", {
        pageSize: 100,
        orderBy: "xp desc",
      });
      const merged = mergeProfiles(cloudProfiles.map(normalizeProfile), sampleProfiles);
      if (!stopped) callback(merged.sort((a, b) => b.xp - a.xp));
    } catch (error) {
      console.error("Profile leaderboard polling failed", error);
      if (!stopped) callback(sampleProfiles);
    }
  };
  void load();
  const timer = window.setInterval(() => void load(), 20_000);
  const refresh = () => void load();
  window.addEventListener(PROFILE_EVENT, refresh);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener(PROFILE_EVENT, refresh);
  };
}

function mergeProfiles(primary: UserProfile[], fallback: UserProfile[]): UserProfile[] {
  const ids = new Set(primary.map((profile) => profile.id));
  return [...primary, ...fallback.filter((profile) => !ids.has(profile.id))];
}

export interface AwardXpOptions {
  userId?: string;
  issueId: string;
  action: XpAction;
  points: number;
  label: string;
  statsDelta?: Partial<ContributionStats>;
}

export async function awardXp(options: AwardXpOptions): Promise<{ awarded: boolean; profile: UserProfile }> {
  const userId = options.userId || (await resolveCurrentUserId());
  const eventId = eventIdFor(userId, options.action, options.issueId);
  const profile = (await getProfile(userId)) || (userId === (await resolveCurrentUserId()) ? await ensureCurrentProfile() : null);
  if (!profile) throw new Error("The contributor profile could not be found.");

  if (!firebaseConfigured) {
    const events = readLocalEvents();
    if (events.some((event) => event.id === eventId)) return { awarded: false, profile };
    const event: XpEvent = {
      id: eventId,
      userId,
      issueId: options.issueId,
      action: options.action,
      points: options.points,
      label: options.label,
      createdAt: new Date().toISOString(),
    };
    writeLocalEvents([event, ...events]);
    const updated = applyProfileDelta(profile, options.points, options.statsDelta);
    await saveProfile(updated);
    return { awarded: true, profile: updated };
  }

  const existing = await getFirebaseDocument<XpEvent>(`profiles/${userId}/xpEvents/${eventId}`);
  if (existing) return { awarded: false, profile };
  const event: XpEvent = {
    id: eventId,
    userId,
    issueId: options.issueId,
    action: options.action,
    points: options.points,
    label: options.label,
    createdAt: new Date().toISOString(),
  };
  await putFirebaseDocument(`profiles/${userId}/xpEvents/${eventId}`, event);
  const updated = applyProfileDelta(profile, options.points, options.statsDelta);
  await saveProfile(updated);
  return { awarded: true, profile: updated };
}

export async function revokeXp(options: AwardXpOptions): Promise<{ revoked: boolean; profile: UserProfile }> {
  const userId = options.userId || (await resolveCurrentUserId());
  const eventId = eventIdFor(userId, options.action, options.issueId);
  const profile = (await getProfile(userId)) || (await ensureCurrentProfile());

  if (!firebaseConfigured) {
    const events = readLocalEvents();
    if (!events.some((event) => event.id === eventId)) return { revoked: false, profile };
    writeLocalEvents(events.filter((event) => event.id !== eventId));
    const inverse = invertDelta(options.statsDelta);
    const updated = applyProfileDelta(profile, -options.points, inverse);
    await saveProfile(updated);
    return { revoked: true, profile: updated };
  }

  const existing = await getFirebaseDocument<XpEvent>(`profiles/${userId}/xpEvents/${eventId}`);
  if (!existing) return { revoked: false, profile };
  await deleteFirebaseDocument(`profiles/${userId}/xpEvents/${eventId}`);
  const updated = applyProfileDelta(profile, -options.points, invertDelta(options.statsDelta));
  await saveProfile(updated);
  return { revoked: true, profile: updated };
}

export async function listXpEvents(userId: string): Promise<XpEvent[]> {
  if (!firebaseConfigured) {
    return readLocalEvents()
      .filter((event) => event.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return (
    await listFirebaseCollection<XpEvent>(`profiles/${userId}/xpEvents`, {
      pageSize: 100,
      orderBy: "createdAt desc",
    })
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function eventIdFor(userId: string, action: XpAction, issueId: string): string {
  return `${userId}_${action}_${issueId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function applyProfileDelta(
  profile: UserProfile,
  points: number,
  statsDelta?: Partial<ContributionStats>,
): UserProfile {
  const stats = { ...profile.stats };
  for (const [key, value] of Object.entries(statsDelta || {})) {
    const statKey = key as keyof ContributionStats;
    stats[statKey] = Math.max(0, stats[statKey] + Number(value || 0));
  }
  const xp = Math.max(0, profile.xp + points);
  return {
    ...profile,
    xp,
    badge: badgeForXp(xp),
    stats,
    updatedAt: new Date().toISOString(),
  };
}

function invertDelta(delta?: Partial<ContributionStats>): Partial<ContributionStats> {
  return Object.fromEntries(
    Object.entries(delta || {}).map(([key, value]) => [key, -Number(value || 0)]),
  ) as Partial<ContributionStats>;
}

export function badgeForXp(xp: number): BadgeName {
  if (xp >= 3000) return "Diamond Civic Champion";
  if (xp >= 1500) return "Platinum Civic Champion";
  if (xp >= 700) return "Gold Civic Champion";
  if (xp >= 300) return "Silver Civic Champion";
  if (xp >= 100) return "Bronze Civic Champion";
  return "Civic Starter";
}

export function badgeProgress(xp: number): {
  current: BadgeName;
  next?: BadgeName;
  currentFloor: number;
  nextTarget: number;
  percent: number;
} {
  const levels: Array<{ name: BadgeName; xp: number }> = [
    { name: "Civic Starter", xp: 0 },
    { name: "Bronze Civic Champion", xp: 100 },
    { name: "Silver Civic Champion", xp: 300 },
    { name: "Gold Civic Champion", xp: 700 },
    { name: "Platinum Civic Champion", xp: 1500 },
    { name: "Diamond Civic Champion", xp: 3000 },
  ];
  const currentIndex = [...levels].reverse().findIndex((level) => xp >= level.xp);
  const index = levels.length - 1 - currentIndex;
  const current = levels[Math.max(0, index)];
  const next = levels[index + 1];
  if (!next) {
    return { current: current.name, currentFloor: current.xp, nextTarget: current.xp, percent: 100 };
  }
  const percent = Math.min(100, Math.max(0, ((xp - current.xp) / (next.xp - current.xp)) * 100));
  return {
    current: current.name,
    next: next.name,
    currentFloor: current.xp,
    nextTarget: next.xp,
    percent,
  };
}

export function badgeIcon(badge: BadgeName): string {
  if (badge.startsWith("Diamond")) return "💎";
  if (badge.startsWith("Platinum")) return "🏆";
  if (badge.startsWith("Gold")) return "🥇";
  if (badge.startsWith("Silver")) return "🥈";
  if (badge.startsWith("Bronze")) return "🥉";
  return "🌱";
}
