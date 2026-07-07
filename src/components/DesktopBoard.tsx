"use client";

import { useEffect, useRef, useState } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { UserButton } from "@clerk/nextjs";
import {
  LogoMark,
  ChevronIcon,
  SunMoonIcon,
  PlusIcon,
  MinusIcon,
  UploadIcon,
  CheckCircleIcon,
  FilterIcon,
  SortIcon,
  MoreIcon,
} from "./icons";
import { GanttChart, type GanttChartTask } from "./GanttChart";
import { NewProjectModal } from "./NewProjectModal";
import { ImportJiraModal } from "./ImportJiraModal";
import { EditItemModal } from "./EditItemModal";
import type { BoardProps } from "./board-types";
import type { SortBy, TaskStatus } from "@/lib/types";
import { ZOOM_LEVELS } from "@/lib/types";
import { DEFAULT_FILTERS, TASK_STATUS_CLASS, TASK_STATUS_LABELS, type FilterState } from "@/lib/gantt-logic";
import { ownerAvatarStyle } from "@/lib/owner-colors";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "dueDate", label: "Due date" },
  { value: "progress", label: "Progress" },
  { value: "name", label: "Name (A–Z)" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  ["todo", "inProgress", "complete"] as TaskStatus[]
).map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));

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
  const [editingItem, setEditingItem] = useState<GanttChartTask | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const zoomIndex = ZOOM_LEVELS.findIndex((z) => z.name === viewMode);
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

  const toggleDraftStatus = (status: TaskStatus) => {
    setDraftFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status) ? prev.statuses.filter((s) => s !== status) : [...prev.statuses, status],
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
    (filters.owners.length > 0 ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  const ganttTasks: GanttChartTask[] = rows.map((r) => {
    // A project with no child tasks has its own editable start/end, so it
    // gets a distinct class that stays draggable/resizable; a project with
    // tasks shows a computed rollup span and stays non-interactive.
    const isLeafProject = r.kind === "project" && !r.hasTasks;
    // Only tasks and projects that have tasks carry a meaningful percentage
    // complete - a childless project has nothing to roll up.
    const hasProgress = r.kind === "task" || r.hasTasks;
    const base = r.kind === "project" ? (isLeafProject ? "g-parent-leaf" : "g-parent") : "g-child";
    const suffix = r.kind === "task" && r.taskStatus ? TASK_STATUS_CLASS[r.taskStatus] : r.complete ? "-complete" : "";
    return {
      id: r.id,
      name: r.name,
      start: r.start,
      end: r.end,
      progress: hasProgress ? r.progress : 0,
      assignee: r.person || "",
      description: r.description || "",
      custom_class: `${base}${suffix}`,
      kind: r.kind,
      hasTasks: r.hasTasks,
      taskStatus: r.taskStatus ?? undefined,
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

          <span className="toolbar-group-label">Zoom</span>
          <div className="seg" style={{ alignItems: "center", gap: 3 }}>
            <button
              className="iconbtn"
              style={{ width: 34, height: 34 }}
              disabled={zoomIndex <= 0}
              onClick={() => setViewMode(ZOOM_LEVELS[zoomIndex - 1].name)}
              title="Zoom in"
            >
              <PlusIcon size={16} />
            </button>
            <span style={{ font: "500 12.5px var(--font-hanken), sans-serif", color: "var(--ui-text-2)", padding: "0 8px", minWidth: 52, textAlign: "center" }}>
              {ZOOM_LEVELS[zoomIndex]?.label}
            </span>
            <button
              className="iconbtn"
              style={{ width: 34, height: 34 }}
              disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
              onClick={() => setViewMode(ZOOM_LEVELS[zoomIndex + 1].name)}
              title="Zoom out"
            >
              <MinusIcon size={16} />
            </button>
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

                <div className="popover-section-label">Task status</div>
                {STATUS_OPTIONS.map((opt) => (
                  <div key={opt.value} className="popover-row" onClick={() => toggleDraftStatus(opt.value)}>
                    <span>{opt.label}</span>
                    <Checkbox checked={draftFilters.statuses.includes(opt.value)} />
                  </div>
                ))}

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
              const complete = r.complete;
              return (
                <div
                  key={r.id}
                  className="lrow"
                  style={{ height: 44, paddingLeft: isProj ? 14 : 40, paddingRight: 14 }}
                  onClick={isProj && r.hasTasks ? () => toggle(r.id) : undefined}
                >
                  <ChevronIcon className={r.open ? "open" : ""} style={{ visibility: isProj && r.hasTasks ? "visible" : "hidden" }} />
                  <div className="av" style={{ width: isProj ? 22 : 18, height: isProj ? 22 : 18, ...ownerAvatarStyle(r.person) }}>
                    {r.initials}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isProj ? 600 : 500,
                      color: isProj ? "var(--ui-text)" : complete ? "var(--ui-text-3)" : "var(--ui-text-2)",
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
          <GanttChart tasks={ganttTasks} viewMode={viewMode} onBarClick={setEditingItem} />
        </div>
      </div>
      <NewProjectModal opened={modalOpen} owners={owners} onClose={() => setModalOpen(false)} />
      <ImportJiraModal opened={importOpen} onClose={() => setImportOpen(false)} />
      {editingItem && (
        <EditItemModal key={editingItem.id} item={editingItem} owners={owners} onClose={() => setEditingItem(null)} />
      )}
    </div>
  );
}
