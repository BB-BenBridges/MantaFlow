import type { TaskDTO, SubtaskStatus } from "./types";

/** Parses RFC4180-ish CSV text (quoted fields, embedded commas/newlines, "" escapes). */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  while (i < len) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

const JIRA_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/** Parses Jira's export date format, e.g. "29/11/24 2:40 PM" (DD/MM/YY). */
export function parseJiraDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = JIRA_DATE_RE.exec(raw.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  let hour = Number(m[4]) % 12;
  if (/pm/i.test(m[6])) hour += 12;
  const minute = Number(m[5]);
  return new Date(year, month - 1, day, hour, minute);
}

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  statusCategory: string;
  assignee: string;
  created: Date | null;
  dueDate: Date | null;
  startDate: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  resolved: Date | null;
  updated: Date | null;
  parentKey: string;
  parentSummary: string;
}

const REQUIRED_COLUMNS = ["Issue key", "Summary"];

function buildColumnIndex(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    if (!(h in idx)) idx[h] = i;
  });
  return idx;
}

export function parseJiraIssues(csvText: string): JiraIssue[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const [header, ...body] = rows;
  const col = buildColumnIndex(header);

  for (const required of REQUIRED_COLUMNS) {
    if (!(required in col)) {
      throw new Error(`This doesn't look like a Jira issue export - missing "${required}" column`);
    }
  }

  const get = (row: string[], name: string) => (col[name] !== undefined ? (row[col[name]] ?? "").trim() : "");

  return body
    .filter((row) => row.some((c) => c.trim() !== ""))
    .map((row) => ({
      key: get(row, "Issue key"),
      summary: get(row, "Summary"),
      description: get(row, "Description"),
      statusCategory: get(row, "Status Category"),
      assignee: get(row, "Assignee"),
      created: parseJiraDate(get(row, "Created")),
      dueDate: parseJiraDate(get(row, "Due date")),
      startDate: parseJiraDate(get(row, "Custom field (Start date)")),
      actualStart: parseJiraDate(get(row, "Custom field (Actual start)")),
      actualEnd: parseJiraDate(get(row, "Custom field (Actual end)")),
      resolved: parseJiraDate(get(row, "Resolved")),
      updated: parseJiraDate(get(row, "Updated")),
      parentKey: get(row, "Parent key"),
      parentSummary: get(row, "Parent summary"),
    }))
    .filter((issue) => issue.key);
}

export interface ImportedSubtask {
  name: string;
  description: string | null;
  person: string | null;
  start: Date;
  end: Date;
  status: SubtaskStatus;
}

export interface ImportedTask {
  name: string;
  description: string | null;
  person: string | null;
  status: TaskDTO["status"];
  startDate: Date | null;
  endDate: Date | null;
  subtasks: ImportedSubtask[];
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function resolveDates(issue: JiraIssue): { start: Date; end: Date } {
  const start = issue.actualStart || issue.startDate || issue.created || new Date();
  let end = issue.actualEnd || issue.dueDate || issue.resolved || issue.updated || start;
  if (end.getTime() < start.getTime()) end = start;
  if (end.getTime() === start.getTime()) end = addDays(start, 1);
  return { start, end };
}

function subtaskStatusFor(issue: JiraIssue): SubtaskStatus {
  const cat = issue.statusCategory.toLowerCase();
  if (cat === "done") return "complete";
  if (cat === "indeterminate") return "inProgress";
  return "todo";
}

function statusFor(issue: JiraIssue): TaskDTO["status"] {
  const cat = issue.statusCategory.toLowerCase();
  if (cat === "done") return "good";
  if (cat === "indeterminate") return "accent";
  if (issue.dueDate && issue.dueDate.getTime() < Date.now()) return "warn";
  return "idle";
}

interface TaskAccumulator {
  name: string;
  description: string | null;
  person: string | null;
  statusIssue: JiraIssue | null;
  ownStart: Date | null;
  ownEnd: Date | null;
  subtasks: ImportedSubtask[];
}

/**
 * Groups a flat Jira issue export into a task hierarchy: top-level issues (no
 * parent) become tasks, and every other issue becomes a subtask under its owning
 * task. A top-level issue that has no children becomes a childless task,
 * using its own dates/status directly rather than being duplicated as a subtask.
 */
export function buildTasksFromIssues(issues: JiraIssue[]): ImportedTask[] {
  const byKey = new Map(issues.map((i) => [i.key, i]));
  const tasks = new Map<string, TaskAccumulator>();

  function ensureTask(key: string, fallbackName: string, description: string, assignee: string, statusIssue: JiraIssue | null) {
    let t = tasks.get(key);
    if (!t) {
      t = { name: fallbackName || key, description: description || null, person: assignee || null, statusIssue, ownStart: null, ownEnd: null, subtasks: [] };
      tasks.set(key, t);
    }
    return t;
  }

  for (const issue of issues) {
    const ownerKey = issue.parentKey || issue.key;
    const owner = byKey.get(ownerKey);
    const task = ensureTask(
      ownerKey,
      owner?.summary || issue.parentSummary || ownerKey,
      owner?.description || "",
      owner?.assignee || issue.assignee,
      owner || (issue.parentKey ? null : issue)
    );

    if (issue.key === ownerKey) {
      // This issue defines the task itself, not a child subtask under it.
      const { start, end } = resolveDates(issue);
      task.ownStart = start;
      task.ownEnd = end;
      continue;
    }

    const { start, end } = resolveDates(issue);
    task.subtasks.push({
      name: issue.summary || issue.key,
      description: issue.description || null,
      person: issue.assignee || null,
      start,
      end,
      status: subtaskStatusFor(issue),
    });
  }

  const result: ImportedTask[] = [];
  for (const t of tasks.values()) {
    if (t.subtasks.length === 0 && !t.ownStart) continue;
    t.subtasks.sort((a, b) => a.start.getTime() - b.start.getTime());
    result.push({
      name: t.name,
      description: t.description,
      person: t.person,
      status: t.statusIssue ? statusFor(t.statusIssue) : "idle",
      startDate: t.subtasks.length === 0 ? t.ownStart : null,
      endDate: t.subtasks.length === 0 ? t.ownEnd : null,
      subtasks: t.subtasks,
    });
  }

  result.sort((a, b) => sortKey(a).getTime() - sortKey(b).getTime());
  return result;
}

function sortKey(t: ImportedTask): Date {
  return t.subtasks[0]?.start ?? t.startDate ?? new Date(0);
}

export function parseJiraCsvToTasks(csvText: string): ImportedTask[] {
  return buildTasksFromIssues(parseJiraIssues(csvText));
}
