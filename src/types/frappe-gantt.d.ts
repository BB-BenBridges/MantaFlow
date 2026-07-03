declare module "frappe-gantt" {
  export interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
    [key: string]: unknown;
  }

  export interface GanttPopupContext {
    task: GanttTask & { start: Date; end: Date };
    set_title: (html: string) => void;
    set_subtitle: (html: string) => void;
    set_details: (html: string) => void;
  }

  export interface GanttViewMode {
    name: string;
    padding?: string;
    step?: string;
    date_format?: string;
    column_width?: number;
    lower_text?: string | ((date: Date, lastDate: Date | null, lang: string) => string);
    upper_text?: string | ((date: Date, lastDate: Date | null, lang: string) => string);
    thick_line?: (date: Date) => boolean;
    snap_at?: string;
    upper_text_frequency?: number;
    [key: string]: unknown;
  }

  export interface GanttOptions {
    view_mode?: string;
    view_modes?: GanttViewMode[];
    bar_height?: number;
    padding?: number;
    upper_header_height?: number;
    lower_header_height?: number;
    column_width?: number;
    bar_corner_radius?: number;
    container_height?: number | "auto";
    infinite_padding?: boolean;
    readonly?: boolean;
    today_button?: boolean;
    view_mode_select?: boolean;
    lines?: "both" | "horizontal" | "vertical" | "none";
    scroll_to?: "start" | "end" | "today";
    popup_on?: "click" | "hover";
    popup?: false | ((ctx: GanttPopupContext) => void);
    auto_move_label?: boolean;
    readonly_dates?: boolean;
    readonly_progress?: boolean;
    move_dependencies?: boolean;
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
    [key: string]: unknown;
  }

  export default class Gantt {
    static VIEW_MODE: Record<string, GanttViewMode>;
    constructor(wrapper: HTMLElement | string | SVGElement, tasks: GanttTask[], options?: GanttOptions);
    change_view_mode(mode: string, maintain_pos?: boolean): void;
    refresh(tasks: GanttTask[]): void;
  }
}
