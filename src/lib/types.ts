export type OrderBy = "project" | "owner";
export type SortBy = "dueDate" | "progress" | "name";

// The name of a zoom level - matches the id passed to the Gantt chart's
// `change_view_mode`. Not the same as the display label (see ZOOM_LEVELS).
export type ViewMode = string;

export interface ZoomLevel {
  name: ViewMode;
  label: string;
  unit: "Day" | "Week" | "Month" | "Year";
  columnWidth: number;
}

// Fine-grained +/- zoom steps, ordered from most zoomed-in to most zoomed-out.
// Each step keeps the same time unit's date grid (cheap to re-render) and
// only varies the pixel width per column, except at unit boundaries.
export const ZOOM_LEVELS: ZoomLevel[] = [
  { name: "day-sm", label: "Day", unit: "Day", columnWidth: 24 },
  { name: "day-md", label: "Day", unit: "Day", columnWidth: 38 },
  { name: "day-lg", label: "Day", unit: "Day", columnWidth: 55 },
  { name: "week-sm", label: "Week", unit: "Week", columnWidth: 90 },
  { name: "week-md", label: "Week", unit: "Week", columnWidth: 140 },
  { name: "week-lg", label: "Week", unit: "Week", columnWidth: 200 },
  { name: "month-sm", label: "Month", unit: "Month", columnWidth: 90 },
  { name: "month-md", label: "Month", unit: "Month", columnWidth: 120 },
  { name: "year", label: "Year", unit: "Year", columnWidth: 120 },
];

export const DEFAULT_VIEW_MODE: ViewMode = "week-md";

export type Theme = "light" | "dark";

export interface TaskDTO {
  id: string;
  name: string;
  person: string | null;
  initials: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  progress: number;
}

export interface ProjectDTO {
  id: string;
  name: string;
  description: string | null;
  person: string | null;
  initials: string;
  status: "accent" | "good" | "warn" | "idle";
  startDate: string | null; // YYYY-MM-DD, used when the project has no tasks
  endDate: string | null; // YYYY-MM-DD, used when the project has no tasks
  tasks: TaskDTO[];
}
