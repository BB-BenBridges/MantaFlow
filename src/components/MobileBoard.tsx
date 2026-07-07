"use client";

import { useState } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { UserButton } from "@clerk/nextjs";
import { LogoMark, ChevronIcon, SunMoonIcon, PlusIcon, MinusIcon, UploadIcon, CheckCircleIcon } from "./icons";
import { NewProjectModal } from "./NewProjectModal";
import { ImportJiraModal } from "./ImportJiraModal";
import { BoardSwitcher } from "./BoardSwitcher";
import { fmtRange, ms, pct } from "@/lib/gantt-logic";
import type { BoardProps } from "./board-types";
import { ZOOM_LEVELS } from "@/lib/types";
import { ownerAvatarStyle } from "@/lib/owner-colors";

export function MobileBoard({
  boards,
  currentBoardId,
  onSwitchBoard,
  rows,
  orderBy,
  setOrderBy,
  viewMode,
  setViewMode,
  toggle,
  win,
  months,
  filters,
  setFilters,
  owners,
}: BoardProps) {
  const { toggleColorScheme } = useMantineColorScheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const zoomIndex = ZOOM_LEVELS.findIndex((z) => z.name === viewMode);

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "16px 10px" }}>
      <div className="app" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", borderBottom: "1px solid var(--ui-border)" }}>
          <LogoMark size={20} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>MantaFlow</span>
          <BoardSwitcher boards={boards} currentBoardId={currentBoardId} onSwitchBoard={onSwitchBoard} />
          <div style={{ flex: 1 }} />
          <button
            className="iconbtn"
            style={{ background: filters.hideCompleted ? "var(--accent-soft)" : undefined, color: filters.hideCompleted ? "var(--accent)" : undefined }}
            onClick={() => setFilters({ ...filters, hideCompleted: !filters.hideCompleted })}
            title={filters.hideCompleted ? "Show completed" : "Hide completed"}
          >
            <CheckCircleIcon />
          </button>
          <button className="iconbtn" onClick={() => toggleColorScheme()}>
            <SunMoonIcon />
          </button>
          <UserButton />
        </div>

        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ui-border)", display: "flex", gap: 8 }}>
          <div className="seg" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}>
            <button
              className="iconbtn"
              style={{ width: 34, height: 34 }}
              disabled={zoomIndex <= 0}
              onClick={() => setViewMode(ZOOM_LEVELS[zoomIndex - 1].name)}
              title="Zoom in"
            >
              <PlusIcon size={16} />
            </button>
            <span style={{ font: "500 12.5px var(--font-hanken), sans-serif", color: "var(--ui-text-2)", padding: "0 4px", flex: 1, textAlign: "center" }}>
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
          <div className="seg" style={{ flex: "none" }}>
            <button className={orderBy === "project" ? "on" : ""} onClick={() => setOrderBy("project")}>
              Project
            </button>
            <button className={orderBy === "owner" ? "on" : ""} onClick={() => setOrderBy("owner")}>
              Owner
            </button>
          </div>
        </div>

        <div style={{ padding: "6px 14px 0" }}>
          <div className="mscale">
            {months.map((m, i) => (
              <span key={`${m.label}-${i}`} className="mtick" style={{ left: m.left }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: 480, overflowY: "auto" }} className="scrollhide">
          {rows.map((r) => {
            const isProj = r.kind === "project";
            // Only tasks and projects that have tasks carry a meaningful percentage
            // complete - a childless project has nothing to roll up.
            const hasProgress = r.kind === "task" || r.hasTasks;
            const complete = r.complete;
            const left = Math.max(0, pct(ms(r.start), win.start, win.end));
            const right = Math.min(100, pct(ms(r.end), win.start, win.end));
            const width = Math.max(1.5, right - left);
            const prog = hasProgress ? width * (r.progress / 100) : 0;
            const mpad = isProj ? 0 : 22;
            return (
              <div
                key={r.id}
                className="lrow"
                style={{ minHeight: 46, padding: "0 14px", flexDirection: "column", alignItems: "stretch", gap: 5, justifyContent: "center" }}
                onClick={isProj && r.hasTasks ? () => toggle(r.id) : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: mpad }}>
                  <ChevronIcon size={13} className={r.open ? "open" : ""} style={{ visibility: isProj && r.hasTasks ? "visible" : "hidden" }} />
                  <div className="av" style={{ width: isProj ? 22 : 18, height: isProj ? 22 : 18, ...ownerAvatarStyle(r.person) }}>
                    {r.initials}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isProj ? 600 : 500,
                      color: isProj ? "var(--ui-text)" : complete ? "var(--ui-text-3)" : "var(--ui-text-2)",
                      flex: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.name}
                  </span>
                  {complete && (
                    <span style={{ color: "var(--good)", display: "flex", flex: "none" }}>
                      <CheckCircleIcon size={12} />
                    </span>
                  )}
                  <span style={{ font: "500 10px var(--font-jetbrains), monospace", color: "var(--ui-text-3)" }}>
                    {fmtRange(r.start, r.end).replace(" – ", "–")}
                  </span>
                </div>
                <div style={{ position: "relative", height: 12, marginLeft: mpad }}>
                  <div
                    className="mbar"
                    style={{
                      left: `${left.toFixed(2)}%`,
                      width: `${width.toFixed(2)}%`,
                      background: complete ? "color-mix(in srgb, var(--good) 25%, transparent)" : isProj ? "var(--accent-soft)" : "var(--ui-surface-3)",
                    }}
                  />
                  <div
                    className="mbar"
                    style={{
                      left: `${left.toFixed(2)}%`,
                      width: `${prog.toFixed(2)}%`,
                      height: 9,
                      background: complete
                        ? "var(--good)"
                        : isProj
                          ? "var(--accent)"
                          : "color-mix(in srgb, var(--accent) 80%, transparent)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: 14, borderTop: "1px solid var(--ui-border)", display: "flex", gap: 8 }}>
          <button
            className="iconbtn"
            style={{ width: "auto", padding: "9px 13px", fontSize: 12.5, fontWeight: 600, gap: 6 }}
            onClick={() => setImportOpen(true)}
            title="Import Jira CSV"
          >
            <UploadIcon size={14} />
          </button>
          <button
            className="iconbtn"
            style={{ flex: 1, background: "var(--accent)", color: "var(--accent-on)", padding: "9px 13px", fontSize: 12.5, fontWeight: 600, gap: 6 }}
            onClick={() => setModalOpen(true)}
          >
            <PlusIcon />
            New project
          </button>
        </div>
      </div>
      <NewProjectModal opened={modalOpen} boardId={currentBoardId} owners={owners} onClose={() => setModalOpen(false)} />
      <ImportJiraModal opened={importOpen} boardId={currentBoardId} onClose={() => setImportOpen(false)} />
    </div>
  );
}
