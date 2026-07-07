import type { CSSProperties } from "react";

// Fixed palette of distinct hues; each owner is deterministically pinned to
// one entry the first time they're seen, and that pin is persisted so the
// same owner keeps the same colour across page loads (and across sessions).
const OWNER_COLOR_PALETTE = [
  "oklch(0.6 0.16 25)", // red
  "oklch(0.62 0.15 50)", // orange
  "oklch(0.68 0.15 95)", // yellow
  "oklch(0.62 0.14 145)", // green
  "oklch(0.65 0.13 180)", // teal
  "oklch(0.6 0.13 220)", // cyan
  "oklch(0.58 0.16 264)", // blue
  "oklch(0.58 0.17 295)", // violet
  "oklch(0.6 0.18 320)", // magenta
  "oklch(0.62 0.17 350)", // pink
];

const STORAGE_KEY = "mantaflow.ownerColors";

function loadAssignments(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAssignments(assignments: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // ignore write failures (e.g. private browsing quota)
  }
}

let assignments: Record<string, number> | null = null;

function assignmentsMap() {
  if (!assignments) assignments = loadAssignments();
  return assignments;
}

export function ownerColorIndex(owner: string): number {
  const map = assignmentsMap();
  if (map[owner] === undefined) {
    const used = new Set(Object.values(map));
    let next = 0;
    while (used.has(next) && used.size < OWNER_COLOR_PALETTE.length) next++;
    map[owner] = next % OWNER_COLOR_PALETTE.length;
    saveAssignments(map);
  }
  return map[owner];
}

export function ownerAvatarStyle(owner: string | null | undefined): CSSProperties | undefined {
  if (!owner) return undefined;
  const color = OWNER_COLOR_PALETTE[ownerColorIndex(owner)];
  return { background: color, color: "#fff" };
}
