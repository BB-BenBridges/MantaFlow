import type { OrderBy, ProjectDTO, SortBy, TaskStatus } from "./types";

export interface FilterState {
  hideCompleted: boolean;
  hideUnassigned: boolean;
  overdueOnly: boolean;
  owners: string[];
  statuses: TaskStatus[];
}

export const DEFAULT_FILTERS: FilterState = {
  hideCompleted: false,
  hideUnassigned: false,
  overdueOnly: false,
  owners: [],
  statuses: [],
};

// Fill width (as a frappe-gantt "progress" percentage) for each status's bar.
// Only "todo" renders as empty - "in progress" and "complete" both fill the
// whole bar and are told apart by color/class (see TASK_STATUS_CLASS) rather
// than by a partial-width bar.
export const TASK_STATUS_PROGRESS: Record<TaskStatus, number> = {
  todo: 0,
  inProgress: 100,
  complete: 100,
};

// Custom-class suffix applied to a task's bar per status, styled in globals.css.
export const TASK_STATUS_CLASS: Record<TaskStatus, string> = {
  todo: "",
  inProgress: "-inprogress",
  complete: "-complete",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  inProgress: "In progress",
  complete: "Complete",
};

export interface VisibleRow {
  kind: "project" | "task";
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  person: string | null;
  initials: string;
  status: "accent" | "good" | "warn" | "idle";
  taskStatus: TaskStatus | null;
  start: string;
  end: string;
  progress: number;
  complete: boolean;
  open: boolean;
  hasTasks: boolean;
}

export function ms(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getTime();
}

export function toDateStr(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function pct(t: number, winStart: number, winEnd: number) {
  return ((t - winStart) / (winEnd - winStart)) * 100;
}

export function fmtRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en-US", opts);
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en-US", opts);
  return `${s} – ${e}`;
}

// A project with no child tasks has nothing to roll up, so its completion is
// assumed directly from its own status instead of being computed.
export function projectSpan(p: ProjectDTO): { start: string; end: string; progress: number; complete: boolean } {
  if (p.tasks.length === 0) {
    return { start: p.startDate ?? "", end: p.endDate ?? "", progress: 0, complete: p.status === "good" };
  }
  const starts = p.tasks.map((t) => ms(t.start));
  const ends = p.tasks.map((t) => ms(t.end));
  const start = Math.min(...starts);
  const end = Math.max(...ends);
  const completedCount = p.tasks.filter((t) => t.status === "complete").length;
  const progress = Math.round((completedCount / p.tasks.length) * 100);
  return { start: toDateStr(start), end: toDateStr(end), progress, complete: completedCount === p.tasks.length };
}

function compareBySort(sortBy: SortBy, a: { name: string; end: string; progress: number }, b: { name: string; end: string; progress: number }) {
  switch (sortBy) {
    case "dueDate":
      return ms(a.end) - ms(b.end);
    case "progress":
      return b.progress - a.progress;
    case "name":
      return a.name.localeCompare(b.name);
  }
}

function isOverdue(end: string, complete: boolean) {
  return !complete && ms(end) < Date.now();
}

function passesFilters(
  filters: FilterState,
  row: { person: string | null; end: string; complete: boolean; taskStatus: TaskStatus | null }
) {
  if (filters.hideCompleted && row.complete) return false;
  if (filters.hideUnassigned && !row.person) return false;
  if (filters.overdueOnly && !isOverdue(row.end, row.complete)) return false;
  if (filters.owners.length > 0 && (!row.person || !filters.owners.includes(row.person))) return false;
  if (filters.statuses.length > 0 && row.taskStatus && !filters.statuses.includes(row.taskStatus)) return false;
  return true;
}

export function visibleRows(
  projects: ProjectDTO[],
  orderBy: OrderBy,
  expanded: Record<string, boolean>,
  filters: FilterState = DEFAULT_FILTERS,
  sortBy: SortBy = "dueDate"
): VisibleRow[] {
  const out: VisibleRow[] = [];
  const byOwner = orderBy === "owner";
  const spans = new Map(projects.map((p) => [p.id, projectSpan(p)]));
  const sorted = projects.slice();
  if (byOwner) {
    sorted.sort((a, b) => (a.person || "").localeCompare(b.person || ""));
  } else {
    sorted.sort((a, b) => compareBySort(sortBy, { name: a.name, ...spans.get(a.id)! }, { name: b.name, ...spans.get(b.id)! }));
  }

  for (const p of sorted) {
    const span = spans.get(p.id)!;
    if (!span.start || !span.end) continue;
    if (!passesFilters(filters, { person: p.person, end: span.end, complete: span.complete, taskStatus: null })) continue;
    out.push({
      kind: "project",
      id: p.id,
      projectId: p.id,
      name: p.name,
      description: p.description,
      person: p.person,
      initials: p.initials,
      status: p.status,
      taskStatus: null,
      start: span.start,
      end: span.end,
      progress: span.progress,
      complete: span.complete,
      open: !!expanded[p.id],
      hasTasks: p.tasks.length > 0,
    });
    if (expanded[p.id] && p.tasks.length > 0) {
      const tasks = p.tasks.slice();
      const withProgress = tasks.map((t) => ({ ...t, progress: TASK_STATUS_PROGRESS[t.status] }));
      if (byOwner) {
        withProgress.sort(
          (a, b) => (a.person || "").localeCompare(b.person || "") || ms(a.start) - ms(b.start)
        );
      } else {
        withProgress.sort((a, b) => compareBySort(sortBy, a, b));
      }
      for (const t of withProgress) {
        const complete = t.status === "complete";
        if (!passesFilters(filters, { person: t.person, end: t.end, complete, taskStatus: t.status })) continue;
        out.push({
          kind: "task",
          id: t.id,
          projectId: p.id,
          name: t.name,
          description: t.description,
          person: t.person,
          initials: t.initials,
          status: "idle",
          taskStatus: t.status,
          start: t.start,
          end: t.end,
          progress: t.progress,
          complete,
          open: false,
          hasTasks: false,
        });
      }
    }
  }
  return out;
}

export function capitalizeName(name: string): string {
  return name
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function uniqueOwners(projects: ProjectDTO[]): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    if (p.person) set.add(p.person);
    for (const t of p.tasks) {
      if (t.person) set.add(t.person);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function windowFor(projects: ProjectDTO[]): { start: number; end: number } {
  const allDates: number[] = [];
  for (const p of projects) {
    for (const t of p.tasks) {
      allDates.push(ms(t.start), ms(t.end));
    }
  }
  if (allDates.length === 0) {
    const now = Date.now();
    return { start: now, end: now + 1000 * 60 * 60 * 24 * 90 };
  }
  const start = Math.min(...allDates);
  const end = Math.max(...allDates);
  const pad = (end - start) * 0.04;
  return { start: start - pad, end: end + pad };
}

export function monthTicks(winStart: number, winEnd: number) {
  const ticks: { label: string; left: string }[] = [];
  const start = new Date(winStart);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(winEnd);
  while (cursor.getTime() <= endDate.getTime()) {
    const left = Math.max(2, pct(cursor.getTime(), winStart, winEnd));
    ticks.push({
      label: cursor.toLocaleDateString("en-US", { month: "short" }),
      left: `${left.toFixed(2)}%`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}
