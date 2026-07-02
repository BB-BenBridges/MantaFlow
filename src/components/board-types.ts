import type { VisibleRow } from "@/lib/gantt-logic";
import type { OrderBy, ProjectDTO, ViewMode } from "@/lib/types";

export interface BoardProps {
  rows: VisibleRow[];
  orderBy: OrderBy;
  setOrderBy: (v: OrderBy) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  toggle: (id: string) => void;
  win: { start: number; end: number };
  months: { label: string; left: string }[];
  projects: ProjectDTO[];
  hideCompleted: boolean;
  setHideCompleted: (v: boolean) => void;
}
