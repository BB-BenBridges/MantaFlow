"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import type { BoardDTO, ProjectDTO, OrderBy, SortBy, ViewMode } from "@/lib/types";
import { DEFAULT_VIEW_MODE } from "@/lib/types";
import { visibleRows, windowFor, monthTicks, uniqueOwners, DEFAULT_FILTERS, type FilterState } from "@/lib/gantt-logic";
import { DesktopBoard } from "./DesktopBoard";
import { MobileBoard } from "./MobileBoard";

interface GanttAppProps {
  boards: BoardDTO[];
  currentBoardId: string;
  projects: ProjectDTO[];
}

export function GanttApp({ boards, currentBoardId, projects }: GanttAppProps) {
  const isMobile = useMediaQuery("(max-width: 780px)");
  const router = useRouter();
  const onSwitchBoard = (boardId: string) => {
    router.push(`/?board=${boardId}`);
  };
  const [orderBy, setOrderBy] = useLocalStorage<OrderBy>({
    key: "gantt-order-by",
    defaultValue: "project",
  });
  const [sortBy, setSortBy] = useLocalStorage<SortBy>({
    key: "gantt-sort-by",
    defaultValue: "dueDate",
  });
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>({
    key: "gantt-view-mode",
    defaultValue: DEFAULT_VIEW_MODE,
  });
  const [storedFilters, setFilters] = useLocalStorage<FilterState>({
    key: "gantt-filters",
    defaultValue: DEFAULT_FILTERS,
  });
  // Merge in case a filter was persisted before a newer field (e.g. `statuses`)
  // was added to FilterState, so older localStorage values don't crash.
  const filters: FilterState = useMemo(() => ({ ...DEFAULT_FILTERS, ...storedFilters }), [storedFilters]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (projects[0]) initial[projects[0].id] = true;
    if (projects[2]) initial[projects[2].id] = true;
    return initial;
  });

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const rows = useMemo(
    () => visibleRows(projects, orderBy, expanded, filters, sortBy),
    [projects, orderBy, expanded, filters, sortBy]
  );
  const win = useMemo(() => windowFor(projects), [projects]);
  const months = useMemo(() => monthTicks(win.start, win.end), [win]);
  const owners = useMemo(() => uniqueOwners(projects), [projects]);

  const props = {
    boards,
    currentBoardId,
    onSwitchBoard,
    rows,
    orderBy,
    setOrderBy,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    toggle,
    win,
    months,
    projects,
    filters,
    setFilters,
    owners,
  };

  return isMobile ? <MobileBoard {...props} /> : <DesktopBoard {...props} />;
}
