"use client";

import { useEffect, useRef } from "react";
import "@/app/frappe-gantt.css";
import type Gantt from "frappe-gantt";
import type { GanttTask, GanttViewMode } from "frappe-gantt";
import { fmtRange } from "@/lib/gantt-logic";
import { ZOOM_LEVELS, type ViewMode } from "@/lib/types";
import { updateTaskDates, updateTaskProgress, updateProjectDates } from "@/server/actions";

export interface GanttChartTask extends GanttTask {
  assignee?: string;
  description?: string;
  kind?: "project" | "task";
  hasTasks?: boolean;
}

interface GanttChartProps {
  tasks: GanttChartTask[];
  viewMode: ViewMode;
  onBarClick?: (task: GanttChartTask) => void;
}

// For bars wider than the viewport, frappe-gantt centers the label on the
// full bar, which can leave it scrolled out of view. Re-center each label
// on the portion of its bar that's actually visible instead.
function centerBarLabels(container: HTMLElement) {
  const scrollLeft = container.scrollLeft;
  const clientWidth = container.clientWidth;

  container.querySelectorAll(".bar-wrapper").forEach((wrapper) => {
    const bar = wrapper.querySelector(".bar");
    const label = wrapper.querySelector(".bar-label");
    if (!bar || !label || label.classList.contains("big")) return;

    const barX = parseFloat(bar.getAttribute("x") || "0");
    const barWidth = parseFloat(bar.getAttribute("width") || "0");
    const barEnd = barX + barWidth;

    const visibleStart = Math.max(barX, scrollLeft);
    const visibleEnd = Math.min(barEnd, scrollLeft + clientWidth);
    if (visibleEnd <= visibleStart) return;

    const labelWidth = (label as SVGGraphicsElement).getBBox().width;
    const x = Math.max(
      barX,
      Math.min((visibleStart + visibleEnd) / 2 - labelWidth / 2, barEnd - labelWidth),
    );
    label.setAttribute("x", String(x));
  });
}

// Labels get their final size a tick after the bars are drawn, so wait a
// couple of frames before measuring and positioning them.
function scheduleCenterBarLabels(container: HTMLElement) {
  requestAnimationFrame(() => requestAnimationFrame(() => centerBarLabels(container)));
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// A project with child tasks shows a span/progress rolled up from those
// tasks, so dragging it wouldn't map to a single editable field. A project
// with no tasks has its own start/end and is editable directly.
function isNonEditableProjectBar(task: GanttChartTask) {
  return task.kind === "project" && !!task.hasTasks;
}

export function GanttChart({ tasks, viewMode, onBarClick }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const tasksRef = useRef<GanttChartTask[]>(tasks);
  // The chart instance is created once and its `on_click` callback is bound
  // at that time, so read the latest handler through a ref instead of
  // rebuilding the whole chart whenever the parent passes a new function.
  const onBarClickRef = useRef(onBarClick);
  useEffect(() => {
    onBarClickRef.current = onBarClick;
  }, [onBarClick]);

  // Project bars are a computed rollup of their child tasks, so they can't be
  // dragged/resized like a task bar. Block the drag before it starts (capture
  // phase runs before frappe-gantt's own bubble-phase mousedown handler on
  // the SVG) instead of letting it start and silently snapping back.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const blockProjectBarDrag = (e: MouseEvent) => {
      const wrapper = (e.target as HTMLElement).closest(".bar-wrapper");
      if (wrapper?.classList.contains("g-parent") || wrapper?.classList.contains("g-parent-complete")) {
        e.stopPropagation();
      }
    };
    container.addEventListener("mousedown", blockProjectBarDrag, true);
    return () => container.removeEventListener("mousedown", blockProjectBarDrag, true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function apply() {
      tasksRef.current = tasks;
      // Already have a live instance - just swap its task list in place
      // instead of tearing down and rebuilding the whole chart, which is
      // what made expand/collapse feel sluggish.
      if (ganttRef.current) {
        if (tasks.length === 0) {
          scrollCleanupRef.current?.();
          scrollCleanupRef.current = null;
          containerRef.current!.innerHTML = "";
          ganttRef.current = null;
        } else {
          // `refresh` re-renders via `change_view_mode()` with no
          // maintain_pos, which resets scroll_to "start" - save/restore the
          // scroll position ourselves so a background data refresh (e.g.
          // after persisting a drag) doesn't jump the view back to the
          // beginning of the timeline.
          const scrollEl = containerRef.current?.querySelector(".gantt-container") as HTMLElement | null;
          const scrollLeft = scrollEl?.scrollLeft;
          ganttRef.current.refresh(tasks);
          if (scrollEl && scrollLeft !== undefined) scrollEl.scrollLeft = scrollLeft;
          if (scrollEl) scheduleCenterBarLabels(scrollEl);
        }
        return;
      }

      if (tasks.length === 0) return;

      const { default: GanttCtor } = await import("frappe-gantt");
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";

      // Show the year in the upper header for the Day/Week views so a
      // month label (e.g. "December" -> "January") doesn't leave it
      // ambiguous which year is being crossed.
      const withYear = (mode: GanttViewMode): GanttViewMode => ({
        ...mode,
        upper_text: (d: Date, lastDate: Date | null, lang: string) =>
          !lastDate || d.getMonth() !== lastDate.getMonth()
            ? `${d.toLocaleDateString("en-US", { month: "long" })} ${d.getFullYear()}`
            : "",
      });

      // Base mode per time unit - each zoom level reuses one of these and
      // only overrides `name`/`column_width`, so switching between zoom
      // levels within the same unit stays cheap (same date grid, just a
      // different pixel width per column) instead of triggering a full,
      // slow rebuild across a much finer/coarser step like Hour or Year.
      const baseModeByUnit: Record<string, GanttViewMode> = {
        Day: withYear(GanttCtor.VIEW_MODE.DAY),
        Week: withYear(GanttCtor.VIEW_MODE.WEEK),
        Month: GanttCtor.VIEW_MODE.MONTH,
        Year: GanttCtor.VIEW_MODE.YEAR,
      };

      ganttRef.current = new GanttCtor(containerRef.current, tasks, {
        view_mode: viewMode,
        view_modes: ZOOM_LEVELS.map((zoom) => ({
          ...baseModeByUnit[zoom.unit],
          name: zoom.name,
          column_width: zoom.columnWidth,
        })),
        bar_height: 26,
        padding: 18,
        upper_header_height: 45,
        lower_header_height: 30,
        bar_corner_radius: 4,
        container_height: "auto",
        infinite_padding: false,
        readonly: false,
        move_dependencies: false,
        on_date_change: (task, start, end) => {
          const t = task as GanttChartTask;
          if (isNonEditableProjectBar(t)) {
            ganttRef.current?.refresh(tasksRef.current);
            return;
          }
          if (t.kind === "project") {
            updateProjectDates(t.id, toDateStr(start), toDateStr(end));
            return;
          }
          updateTaskDates(t.id, toDateStr(start), toDateStr(end));
        },
        on_progress_change: (task, progress) => {
          const t = task as GanttChartTask;
          // Projects only store a status, not a numeric progress value -
          // there's nothing to persist a progress-handle drag to.
          if (t.kind === "project") {
            ganttRef.current?.refresh(tasksRef.current);
            return;
          }
          updateTaskProgress(t.id, progress);
        },
        on_click: (task) => {
          onBarClickRef.current?.(task as GanttChartTask);
        },
        today_button: false,
        view_mode_select: false,
        lines: "horizontal",
        scroll_to: "today",
        popup_on: "hover",
        popup: (ctx) => {
          const t = ctx.task as GanttChartTask;
          const toIso = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
          ctx.set_title(t.name);
          ctx.set_subtitle((t.assignee ? `${t.assignee}  ·  ` : "") + fmtRange(toIso(ctx.task.start), toIso(ctx.task.end)));
          ctx.set_details(`${t.progress}% complete`);
        },
      });
      // Passing a custom `view_modes` array makes frappe-gantt default to
      // the first entry regardless of `view_mode`, so set it explicitly.
      ganttRef.current.change_view_mode(viewMode);

      const scrollEl = containerRef.current.querySelector(".gantt-container");
      if (scrollEl) {
        const onScrollOrResize = () => centerBarLabels(scrollEl as HTMLElement);
        scrollEl.addEventListener("scroll", onScrollOrResize, { passive: true });
        window.addEventListener("resize", onScrollOrResize);
        scrollCleanupRef.current = () => {
          scrollEl.removeEventListener("scroll", onScrollOrResize);
          window.removeEventListener("resize", onScrollOrResize);
        };
        scheduleCenterBarLabels(scrollEl as HTMLElement);
      }
    }

    apply();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  useEffect(() => {
    return () => {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ganttRef.current) {
      try {
        // `maintain_pos` keeps the current scroll position instead of
        // re-triggering the `scroll_to: "start"` smooth-scroll animation on
        // every zoom step, which is what made zooming feel sluggish.
        ganttRef.current.change_view_mode(viewMode, true);
        const scrollEl = containerRef.current?.querySelector(".gantt-container");
        if (scrollEl) scheduleCenterBarLabels(scrollEl as HTMLElement);
      } catch {
        // ignore
      }
    }
  }, [viewMode]);

  return (
    <div className="gantt-wrap">
      <div ref={containerRef} />
    </div>
  );
}
