"use client";

import { useEffect, useState } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { UserButton } from "@clerk/nextjs";
import {
  LogoMark,
  ChevronIcon,
  SunMoonIcon,
  PlusIcon,
  UploadIcon,
  CheckCircleIcon,
  FilterIcon,
  SortIcon,
  MoreIcon,
} from "./icons";
import { GanttChart, type GanttChartTask } from "./GanttChart";
import { NewProjectModal } from "./NewProjectModal";
import { ImportJiraModal } from "./ImportJiraModal";
import type { BoardProps } from "./board-types";
import type { SortBy, ViewMode } from "@/lib/types";

const VIEW_MODES: ViewMode[] = ["Day", "Week", "Month"];
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "dueDate", label: "Due date" },
  { value: "progress", label: "Progress" },
  { value: "name", label: "Name (A–Z)" },
];

type OpenMenu = "filters" | "sort" | "more" | null;

export function DesktopBoard({
  rows,
  orderBy,
  setOrderBy,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  toggle,
  hideCompleted,
  setHideCompleted,
}: BoardProps) {
  const { toggleColorScheme } = useMantineColorScheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".popover-trigger") && !target.closest(".popover")) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filterCount = hideCompleted ? 1 : 0;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  const ganttTasks: GanttChartTask[] = rows.map((r) => {
    const complete = r.progress >= 100;
    const base = r.kind === "project" ? "g-parent" : "g-child";
    return {
      id: r.id,
      name: r.name,
      start: r.start,
      end: r.end,
      progress: r.progress,
      assignee: r.person || "",
      custom_class: complete ? `${base}-complete` : base,
    };
  });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="app" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* identity bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--ui-border)", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <LogoMark />
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-.01em" }}>MantaFlow</span>
            <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>/ IT Delivery</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <button
              className="iconbtn popover-trigger"
              title="More"
              onClick={() => setOpenMenu(openMenu === "more" ? null : "more")}
            >
              <MoreIcon />
            </button>
            {openMenu === "more" && (
              <div className="popover" style={{ right: 0, left: "auto", width: 176 }}>
                <div
                  className="popover-row"
                  onClick={() => {
                    setOpenMenu(null);
                    toggleColorScheme();
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SunMoonIcon size={14} />
                    Toggle theme
                  </span>
                </div>
                <div
                  className="popover-row"
                  onClick={() => {
                    setOpenMenu(null);
                    setImportOpen(true);
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <UploadIcon size={14} />
                    Import Jira CSV
                  </span>
                </div>
              </div>
            )}
          </div>
          <UserButton />
        </div>

        {/* controls bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--ui-border)", flex: "none", flexWrap: "wrap", rowGap: 8 }}>
          <span className="toolbar-group-label">Group</span>
          <div className="seg">
            <button className={orderBy === "project" ? "on" : ""} onClick={() => setOrderBy("project")}>
              Project
            </button>
            <button className={orderBy === "owner" ? "on" : ""} onClick={() => setOrderBy("owner")}>
              Owner
            </button>
          </div>

          <div className="toolbar-divider" />

          <span className="toolbar-group-label">View</span>
          <div className="seg">
            {VIEW_MODES.map((mode) => (
              <button key={mode} className={viewMode === mode ? "on" : ""} onClick={() => setViewMode(mode)}>
                {mode}
              </button>
            ))}
          </div>

          <div className="toolbar-divider" />

          <div style={{ position: "relative" }}>
            <button
              className="iconbtn popover-trigger"
              style={{
                width: "auto",
                padding: "7px 13px",
                fontSize: 12.5,
                fontWeight: 600,
                gap: 6,
                position: "relative",
                background: filterCount > 0 ? "var(--accent-soft)" : undefined,
                color: filterCount > 0 ? "var(--accent)" : undefined,
              }}
              onClick={() => setOpenMenu(openMenu === "filters" ? null : "filters")}
            >
              <FilterIcon />
              Filters
              {filterCount > 0 && <span className="badge-count">{filterCount}</span>}
            </button>
            {openMenu === "filters" && (
              <div className="popover" style={{ width: 220 }}>
                <div className="popover-row" onClick={() => setHideCompleted(!hideCompleted)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircleIcon size={13} />
                    Hide completed
                  </span>
                  {hideCompleted && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2.6} strokeLinecap="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              className="iconbtn popover-trigger"
              style={{
                width: "auto",
                padding: "7px 13px",
                fontSize: 12.5,
                fontWeight: 600,
                gap: 6,
                opacity: orderBy === "owner" ? 0.45 : 1,
                cursor: orderBy === "owner" ? "not-allowed" : "pointer",
              }}
              disabled={orderBy === "owner"}
              title={orderBy === "owner" ? "Sort is unavailable while grouped by owner" : undefined}
              onClick={() => orderBy !== "owner" && setOpenMenu(openMenu === "sort" ? null : "sort")}
            >
              <SortIcon />
              {orderBy === "owner" ? "Sort" : sortLabel}
            </button>
            {openMenu === "sort" && orderBy !== "owner" && (
              <div className="popover" style={{ width: 176 }}>
                {SORT_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`popover-row ${sortBy === opt.value ? "on" : ""}`}
                    onClick={() => {
                      setSortBy(opt.value);
                      setOpenMenu(null);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <button
            className="iconbtn"
            style={{ width: "auto", background: "var(--accent)", color: "var(--accent-on)", padding: "7px 13px", fontSize: 12.5, fontWeight: 600, gap: 6 }}
            onClick={() => setModalOpen(true)}
          >
            <PlusIcon />
            New project
          </button>
        </div>

        {/* body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflowY: "auto" }} className="scrollhide">
          <div style={{ width: 264, flex: "none", borderRight: "1px solid var(--ui-border)", background: "var(--ui-surface)" }}>
            <div
              style={{
                height: 85,
                display: "flex",
                alignItems: "flex-end",
                padding: "0 16px 12px",
                position: "sticky",
                top: 0,
                background: "var(--ui-surface)",
                borderBottom: "1px solid var(--ui-border)",
                zIndex: 5,
              }}
            >
              <span style={{ font: "600 11px var(--font-jetbrains), monospace", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ui-text-3)" }}>
                Project · Owner
              </span>
            </div>
            {rows.map((r) => {
              const isProj = r.kind === "project";
              const complete = r.progress >= 100;
              return (
                <div
                  key={r.id}
                  className="lrow"
                  style={{ height: 44, paddingLeft: isProj ? 14 : 40, paddingRight: 14 }}
                  onClick={isProj ? () => toggle(r.id) : undefined}
                >
                  <ChevronIcon className={r.open ? "open" : ""} style={{ visibility: isProj ? "visible" : "hidden" }} />
                  <div className="av" style={{ width: isProj ? 22 : 18, height: isProj ? 22 : 18 }}>
                    {r.initials}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isProj ? 600 : 500,
                      color: complete ? "var(--ui-text-3)" : isProj ? "var(--ui-text)" : "var(--ui-text-2)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {r.name}
                  </span>
                  {complete && (
                    <span style={{ color: "var(--good)", display: "flex", flex: "none" }}>
                      <CheckCircleIcon size={12} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <GanttChart tasks={ganttTasks} viewMode={viewMode} />
        </div>
      </div>
      <NewProjectModal opened={modalOpen} onClose={() => setModalOpen(false)} />
      <ImportJiraModal opened={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
