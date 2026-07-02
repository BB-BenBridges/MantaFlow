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

export function GanttChart({ tasks, viewMode }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { default: GanttCtor } = await import("frappe-gantt");
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      if (tasks.length === 0) return;

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
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  useEffect(() => {
    if (ganttRef.current) {
      try {
        ganttRef.current.change_view_mode(viewMode);
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
