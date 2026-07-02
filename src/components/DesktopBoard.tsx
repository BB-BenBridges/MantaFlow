"use client";

import { useState } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { UserButton } from "@clerk/nextjs";
import { LogoMark, ChevronIcon, SunMoonIcon, PlusIcon, UploadIcon, CheckCircleIcon } from "./icons";
import { GanttChart, type GanttChartTask } from "./GanttChart";
import { NewProjectModal } from "./NewProjectModal";
import { ImportJiraModal } from "./ImportJiraModal";
import type { BoardProps } from "./board-types";
import type { ViewMode } from "@/lib/types";

const VIEW_MODES: ViewMode[] = ["Day", "Week", "Month"];

export function DesktopBoard({
  rows,
  orderBy,
  setOrderBy,
  viewMode,
  setViewMode,
  toggle,
  hideCompleted,
  setHideCompleted,
}: BoardProps) {
  const { toggleColorScheme } = useMantineColorScheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
        {/* toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid var(--ui-border)", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <LogoMark />
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-.01em" }}>Tempo</span>
            <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>/ IT Delivery</span>
          </div>
          <div style={{ flex: 1 }} />
          <div className="seg">
            <button className={orderBy === "project" ? "on" : ""} onClick={() => setOrderBy("project")}>
              Project
            </button>
            <button className={orderBy === "owner" ? "on" : ""} onClick={() => setOrderBy("owner")}>
              Owner
            </button>
          </div>
          <div className="seg">
            {VIEW_MODES.map((mode) => (
              <button key={mode} className={viewMode === mode ? "on" : ""} onClick={() => setViewMode(mode)}>
                {mode}
              </button>
            ))}
          </div>
          <button
            className="iconbtn"
            style={{
              width: "auto",
              padding: "7px 13px",
              fontSize: 12.5,
              fontWeight: 600,
              gap: 6,
              background: hideCompleted ? "var(--accent-soft)" : undefined,
              color: hideCompleted ? "var(--accent)" : undefined,
            }}
            onClick={() => setHideCompleted(!hideCompleted)}
            title={hideCompleted ? "Show completed" : "Hide completed"}
          >
            <CheckCircleIcon />
            {hideCompleted ? "Completed hidden" : "Hide completed"}
          </button>
          <button className="iconbtn" title="Toggle theme" onClick={() => toggleColorScheme()}>
            <SunMoonIcon />
          </button>
          <button
            className="iconbtn"
            style={{ width: "auto", padding: "7px 13px", fontSize: 12.5, fontWeight: 600, gap: 6 }}
            onClick={() => setImportOpen(true)}
          >
            <UploadIcon />
            Import Jira CSV
          </button>
          <button
            className="iconbtn"
            style={{ width: "auto", background: "var(--accent)", color: "var(--accent-on)", padding: "7px 13px", fontSize: 12.5, fontWeight: 600, gap: 6 }}
            onClick={() => setModalOpen(true)}
          >
            <PlusIcon />
            New project
          </button>
          <UserButton />
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
