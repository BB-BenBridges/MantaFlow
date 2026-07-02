"use client";

import { useEffect, useRef, useState } from "react";
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
import { DEFAULT_FILTERS, type FilterState } from "@/lib/gantt-logic";

const VIEW_MODES: ViewMode[] = ["Day", "Week", "Month"];
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "dueDate", label: "Due date" },
  { value: "progress", label: "Progress" },
  { value: "name", label: "Name (A–Z)" },
];

type OpenMenu = "filters" | "sort" | "more" | null;

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span className={`checkbox-box${checked ? " on" : ""}`}>
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-on)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

export function DesktopBoard({
  rows,
  orderBy,
  setOrderBy,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  toggle,
  filters,
  setFilters,
  owners,
}: BoardProps) {
  const { toggleColorScheme } = useMantineColorScheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [draftFilters, setDraftFilters] = useState<FilterState>(filters);
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeState = useRef<{ startX: number; startWidth: number; width: number } | null>(null);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeState.current = { startX: e.clientX, startWidth: sidebarWidth, width: sidebarWidth };
    document.body.style.cursor = "col-resize";

    const onMove = (ev: MouseEvent) => {
      if (!resizeState.current || !sidebarRef.current) return;
      const delta = ev.clientX - resizeState.current.startX;
      const next = Math.min(480, Math.max(160, resizeState.current.startWidth + delta));
      resizeState.current.width = next;
      sidebarRef.current.style.width = `${next}px`;
    };
    const onUp = () => {
      if (resizeState.current) setSidebarWidth(resizeState.current.width);
      resizeState.current = null;
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const openFilters = () => {
    setDraftFilters(filters);
    setOpenMenu(openMenu === "filters" ? null : "filters");
  };

  const toggleDraft = (key: "hideCompleted" | "hideUnassigned" | "overdueOnly") => {
    setDraftFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDraftOwner = (owner: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      owners: prev.owners.includes(owner) ? prev.owners.filter((o) => o !== owner) : [...prev.owners, owner],
    }));
  };

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

  const filterCount =
    (filters.hideCompleted ? 1 : 0) +
    (filters.hideUnassigned ? 1 : 0) +
    (filters.overdueOnly ? 1 : 0) +
    (filters.owners.length > 0 ? 1 : 0);
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
              onClick={openFilters}
            >
              <FilterIcon />
              Filters
              {filterCount > 0 && <span className="badge-count">{filterCount}</span>}
            </button>
            {openMenu === "filters" && (
              <div className="popover" style={{ width: 240 }}>
                <div className="popover-section-label">Status</div>
                <div className="popover-row" onClick={() => toggleDraft("hideCompleted")}>
                  <span>Hide completed</span>
                  <Checkbox checked={draftFilters.hideCompleted} />
                </div>
                <div className="popover-row" onClick={() => toggleDraft("hideUnassigned")}>
                  <span>Hide unassigned</span>
                  <Checkbox checked={draftFilters.hideUnassigned} />
                </div>
                <div className="popover-row" onClick={() => toggleDraft("overdueOnly")}>
                  <span>Overdue only</span>
                  <Checkbox checked={draftFilters.overdueOnly} />
                </div>

                {owners.length > 0 && (
                  <>
                    <div className="popover-section-label">Owner</div>
                    {owners.map((owner) => (
                      <div key={owner} className="popover-row" onClick={() => toggleDraftOwner(owner)}>
                        <span>{owner}</span>
                        <Checkbox checked={draftFilters.owners.includes(owner)} />
                      </div>
                    ))}
                  </>
                )}

                <div className="popover-footer">
                  <button
                    className="popover-reset"
                    onClick={() => setDraftFilters(DEFAULT_FILTERS)}
                  >
                    Reset
                  </button>
                  <button
                    className="popover-apply"
                    onClick={() => {
                      setFilters(draftFilters);
                      setOpenMenu(null);
                    }}
                  >
                    Apply
                  </button>
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
          <div ref={sidebarRef} style={{ width: sidebarWidth, flex: "none", position: "relative", borderRight: "1px solid var(--ui-border)", background: "var(--ui-surface)" }}>
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
                  onClick={isProj && r.hasTasks ? () => toggle(r.id) : undefined}
                >
                  <ChevronIcon className={r.open ? "open" : ""} style={{ visibility: isProj && r.hasTasks ? "visible" : "hidden" }} />
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
            <div
              onMouseDown={startResize}
              style={{
                position: "absolute",
                top: 0,
                right: -3,
                bottom: 0,
                width: 6,
                cursor: "col-resize",
                zIndex: 6,
              }}
            />
          </div>
          <GanttChart tasks={ganttTasks} viewMode={viewMode} />
        </div>
      </div>
      <NewProjectModal opened={modalOpen} onClose={() => setModalOpen(false)} />
      <ImportJiraModal opened={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
