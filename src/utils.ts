import type { CommunityIssue, IssueCategory, IssueLocation, Severity } from "./types";

export function formatDate(value: string, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function daysBetween(from: string, to = new Date().toISOString()): number {
  return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));
}

export function severityRank(severity: Severity): number {
  return { Low: 1, Medium: 2, High: 3, Critical: 4 }[severity];
}

export function haversineKm(a: IssueLocation, b: IssueLocation): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const toRad = (degree: number) => (degree * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function findPotentialDuplicates(
  issues: CommunityIssue[],
  category: IssueCategory,
  location: IssueLocation,
  radiusKm = 0.6,
): CommunityIssue[] {
  return issues
    .filter((issue) => issue.analysis.category === category && issue.status !== "Resolved")
    .map((issue) => ({ issue, distance: haversineKm(issue.location, location) }))
    .filter((entry) => entry.distance == null
      ? Boolean(location.address && entry.issue.location.address.toLowerCase().includes(location.address.toLowerCase().slice(0, 8)))
      : entry.distance <= radiusKm)
    .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99))
    .slice(0, 3)
    .map((entry) => entry.issue);
}

export async function compressImage(file: File, maxDimension = 1400, quality = 0.8): Promise<string> {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error("Please choose a JPEG, PNG or WebP image.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("The original image must be smaller than 12 MB.");
  }

  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the image."));
    image.src = src;
  });
}

export function categoryIcon(category: IssueCategory): string {
  return {
    Pothole: "🕳️",
    "Water Leakage": "💧",
    "Damaged Streetlight": "💡",
    "Waste Management": "🗑️",
    "Open Drain": "⚠️",
    "Road Damage": "🚧",
    "Fallen Tree": "🌳",
    "Public Infrastructure": "🏗️",
    Other: "📍",
  }[category];
}

export function makeId(prefix = "item"): string {
  const cryptoObject = globalThis.crypto;

  if (
    cryptoObject &&
    typeof cryptoObject.randomUUID === "function"
  ) {
    return `${prefix}_${cryptoObject.randomUUID()}`;
  }

  const fallbackId = [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ].join("_");

  return `${prefix}_${fallbackId}`;
}
