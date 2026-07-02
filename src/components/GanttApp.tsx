"use client";

import { useMemo, useState } from "react";
import { useMediaQuery } from "@mantine/hooks";
import type { ProjectDTO, OrderBy, SortBy, ViewMode } from "@/lib/types";
import { visibleRows, windowFor, monthTicks } from "@/lib/gantt-logic";
import { DesktopBoard } from "./DesktopBoard";
import { MobileBoard } from "./MobileBoard";

interface GanttAppProps {
  projects: ProjectDTO[];
}

export function GanttApp({ projects }: GanttAppProps) {
  const isMobile = useMediaQuery("(max-width: 780px)");
  const [orderBy, setOrderBy] = useState<OrderBy>("project");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");
  const [viewMode, setViewMode] = useState<ViewMode>("Week");
  const [hideCompleted, setHideCompleted] = useState(false);
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
    () => visibleRows(projects, orderBy, expanded, hideCompleted, sortBy),
    [projects, orderBy, expanded, hideCompleted, sortBy]
  );
  const win = useMemo(() => windowFor(projects), [projects]);
  const months = useMemo(() => monthTicks(win.start, win.end), [win]);

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
    hideCompleted,
    setHideCompleted,
  };

  return isMobile ? <MobileBoard {...props} /> : <DesktopBoard {...props} />;
}
