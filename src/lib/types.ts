export type OrderBy = "project" | "owner";
export type SortBy = "dueDate" | "progress" | "name";
export type ViewMode = "Day" | "Week" | "Month";
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
