"use client";

import { useMemo, useState } from "react";
import { useMediaQuery } from "@mantine/hooks";
import type { ProjectDTO, OrderBy, SortBy, ViewMode } from "@/lib/types";
import { DEFAULT_VIEW_MODE } from "@/lib/types";
import { visibleRows, windowFor, monthTicks, uniqueOwners, DEFAULT_FILTERS, type FilterState } from "@/lib/gantt-logic";
import { DesktopBoard } from "./DesktopBoard";
import { MobileBoard } from "./MobileBoard";

interface GanttAppProps {
  projects: ProjectDTO[];
}

export function GanttApp({ projects }: GanttAppProps) {
  const isMobile = useMediaQuery("(max-width: 780px)");
  const [orderBy, setOrderBy] = useState<OrderBy>("project");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
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
