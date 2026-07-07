import type { FilterState, VisibleRow } from "@/lib/gantt-logic";
import type { BoardDTO, OrderBy, ProjectDTO, SortBy, ViewMode } from "@/lib/types";

export interface BoardProps {
  boards: BoardDTO[];
  currentBoardId: string;
  onSwitchBoard: (boardId: string) => void;
  rows: VisibleRow[];
  orderBy: OrderBy;
  setOrderBy: (v: OrderBy) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  toggle: (id: string) => void;
  win: { start: number; end: number };
  months: { label: string; left: string }[];
  projects: ProjectDTO[];
  filters: FilterState;
  setFilters: (v: FilterState) => void;
  owners: string[];
}
