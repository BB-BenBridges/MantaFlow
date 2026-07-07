import type { OrderBy, TaskDTO, SortBy, SubtaskStatus } from "./types";

export interface FilterState {
  hideCompleted: boolean;
  hideUnassigned: boolean;
  overdueOnly: boolean;
  owners: string[];
  statuses: SubtaskStatus[];
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
// whole bar and are told apart by color/class (see SUBTASK_STATUS_CLASS) rather
// than by a partial-width bar.
export const SUBTASK_STATUS_PROGRESS: Record<SubtaskStatus, number> = {
  todo: 0,
  inProgress: 100,
  complete: 100,
};

// Custom-class suffix applied to a subtask's bar per status, styled in globals.css.
export const SUBTASK_STATUS_CLASS: Record<SubtaskStatus, string> = {
  todo: "",
  inProgress: "-inprogress",
  complete: "-complete",
};

export const SUBTASK_STATUS_LABELS: Record<SubtaskStatus, string> = {
  todo: "To do",
  inProgress: "In progress",
  complete: "Complete",
};

export interface VisibleRow {
  kind: "task" | "subtask";
  id: string;
  taskId: string;
  name: string;
  description: string | null;
  person: string | null;
  initials: string;
  status: "accent" | "good" | "warn" | "idle";
  subtaskStatus: SubtaskStatus | null;
  start: string;
  end: string;
  progress: number;
  complete: boolean;
  open: boolean;
  hasSubtasks: boolean;
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

// A task with no child subtasks has nothing to roll up, so its completion is
// assumed directly from its own status instead of being computed.
export function taskSpan(t: TaskDTO): { start: string; end: string; progress: number; complete: boolean } {
  if (t.subtasks.length === 0) {
    return { start: t.startDate ?? "", end: t.endDate ?? "", progress: 0, complete: t.status === "good" };
  }
  const starts = t.subtasks.map((s) => ms(s.start));
  const ends = t.subtasks.map((s) => ms(s.end));
  const start = Math.min(...starts);
  const end = Math.max(...ends);
  const completedCount = t.subtasks.filter((s) => s.status === "complete").length;
  const progress = Math.round((completedCount / t.subtasks.length) * 100);
  return { start: toDateStr(start), end: toDateStr(end), progress, complete: completedCount === t.subtasks.length };
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
  row: { person: string | null; end: string; complete: boolean; subtaskStatus: SubtaskStatus | null }
) {
  if (filters.hideCompleted && row.complete) return false;
  if (filters.hideUnassigned && !row.person) return false;
  if (filters.overdueOnly && !isOverdue(row.end, row.complete)) return false;
  if (filters.owners.length > 0 && (!row.person || !filters.owners.includes(row.person))) return false;
  if (filters.statuses.length > 0 && row.subtaskStatus && !filters.statuses.includes(row.subtaskStatus)) return false;
  return true;
}

export function visibleRows(
  tasks: TaskDTO[],
  orderBy: OrderBy,
  expanded: Record<string, boolean>,
  filters: FilterState = DEFAULT_FILTERS,
  sortBy: SortBy = "dueDate"
): VisibleRow[] {
  const out: VisibleRow[] = [];
  const byOwner = orderBy === "owner";
  const spans = new Map(tasks.map((t) => [t.id, taskSpan(t)]));
  const sorted = tasks.slice();
  if (byOwner) {
    sorted.sort((a, b) => (a.person || "").localeCompare(b.person || ""));
  } else {
    sorted.sort((a, b) => compareBySort(sortBy, { name: a.name, ...spans.get(a.id)! }, { name: b.name, ...spans.get(b.id)! }));
  }

  for (const t of sorted) {
    const span = spans.get(t.id)!;
    if (!span.start || !span.end) continue;
    if (!passesFilters(filters, { person: t.person, end: span.end, complete: span.complete, subtaskStatus: null })) continue;
    out.push({
      kind: "task",
      id: t.id,
      taskId: t.id,
      name: t.name,
      description: t.description,
      person: t.person,
      initials: t.initials,
      status: t.status,
      subtaskStatus: null,
      start: span.start,
      end: span.end,
      progress: span.progress,
      complete: span.complete,
      open: !!expanded[t.id],
      hasSubtasks: t.subtasks.length > 0,
    });
    if (expanded[t.id] && t.subtasks.length > 0) {
      const subtasks = t.subtasks.slice();
      const withProgress = subtasks.map((s) => ({ ...s, progress: SUBTASK_STATUS_PROGRESS[s.status] }));
      if (byOwner) {
        withProgress.sort(
          (a, b) => (a.person || "").localeCompare(b.person || "") || ms(a.start) - ms(b.start)
        );
      } else {
        withProgress.sort((a, b) => compareBySort(sortBy, a, b));
      }
      for (const s of withProgress) {
        const complete = s.status === "complete";
        if (!passesFilters(filters, { person: s.person, end: s.end, complete, subtaskStatus: s.status })) continue;
        out.push({
          kind: "subtask",
          id: s.id,
          taskId: t.id,
          name: s.name,
          description: s.description,
          person: s.person,
          initials: s.initials,
          status: "idle",
          subtaskStatus: s.status,
          start: s.start,
          end: s.end,
          progress: s.progress,
          complete,
          open: false,
          hasSubtasks: false,
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

export function uniqueOwners(tasks: TaskDTO[]): string[] {
  const set = new Set<string>();
  for (const t of tasks) {
    if (t.person) set.add(t.person);
    for (const s of t.subtasks) {
      if (s.person) set.add(s.person);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function windowFor(tasks: TaskDTO[]): { start: number; end: number } {
  const allDates: number[] = [];
  for (const t of tasks) {
    for (const s of t.subtasks) {
      allDates.push(ms(s.start), ms(s.end));
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
