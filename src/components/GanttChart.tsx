"use client";

import { useEffect, useRef } from "react";
import "@/app/frappe-gantt.css";
import type Gantt from "frappe-gantt";
import type { GanttTask, GanttViewMode } from "frappe-gantt";
import { fmtRange } from "@/lib/gantt-logic";
import type { ViewMode } from "@/lib/types";

export interface GanttChartTask extends GanttTask {
  assignee?: string;
}

interface GanttChartProps {
  tasks: GanttChartTask[];
  viewMode: ViewMode;
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

export function GanttChart({ tasks, viewMode }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function apply() {
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
          ganttRef.current.refresh(tasks);
          const scrollEl = containerRef.current?.querySelector(".gantt-container");
          if (scrollEl) scheduleCenterBarLabels(scrollEl as HTMLElement);
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

      ganttRef.current = new GanttCtor(containerRef.current, tasks, {
        view_mode: viewMode,
        view_modes: [
          withYear(GanttCtor.VIEW_MODE.DAY),
          withYear(GanttCtor.VIEW_MODE.WEEK),
          GanttCtor.VIEW_MODE.MONTH,
        ],
        bar_height: 26,
        padding: 18,
        upper_header_height: 45,
        lower_header_height: 30,
        bar_corner_radius: 4,
        container_height: "auto",
        infinite_padding: false,
        readonly: true,
        today_button: false,
        view_mode_select: false,
        lines: "horizontal",
        scroll_to: "start",
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
        ganttRef.current.change_view_mode(viewMode);
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
