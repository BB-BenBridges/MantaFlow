"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { initialsOf } from "@/lib/initials";
import { parseJiraCsvToTasks } from "@/lib/jira-import";
import type { SubtaskStatus } from "@/lib/types";

export interface CreateTaskInput {
  boardId: string;
  name: string;
  description?: string;
  person?: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export async function createTask(input: CreateTaskInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Task name is required");

  const count = await prisma.task.count({ where: { boardId: input.boardId } });

  await prisma.task.create({
    data: {
      name,
      description: input.description?.trim() || null,
      person: input.person?.trim() || null,
      initials: initialsOf(input.person?.trim() || name),
      status: "idle",
      order: count,
      boardId: input.boardId,
      startDate: new Date(`${input.start}T00:00:00`),
      endDate: new Date(`${input.end}T00:00:00`),
    },
  });

  revalidatePath("/");
}

export interface CreateBoardResult {
  id: string;
}

export async function createBoard(name: string): Promise<CreateBoardResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Board name is required");

  const count = await prisma.board.count();

  const board = await prisma.board.create({
    data: { name: trimmed, order: count },
  });

  revalidatePath("/");

  return { id: board.id };
}

export async function updateSubtaskDates(id: string, start: string, end: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.subtask.update({
    where: { id },
    data: {
      start: new Date(`${start}T00:00:00`),
      end: new Date(`${end}T00:00:00`),
    },
  });

  revalidatePath("/");
}

export interface UpdateSubtaskInput {
  name: string;
  description?: string;
  person?: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  status: SubtaskStatus;
}

export async function updateSubtask(id: string, input: UpdateSubtaskInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Subtask name is required");

  const person = input.person?.trim() || null;

  await prisma.subtask.update({
    where: { id },
    data: {
      name,
      description: input.description?.trim() || null,
      person,
      initials: initialsOf(person || name),
      start: new Date(`${input.start}T00:00:00`),
      end: new Date(`${input.end}T00:00:00`),
      status: input.status,
    },
  });

  revalidatePath("/");
}

export interface UpdateTaskInput {
  name: string;
  description?: string;
  person?: string;
  // Omitted for a task with child subtasks, since its span is a rollup
  // computed from those subtasks rather than a value stored on the task.
  start?: string;
  end?: string;
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Task name is required");

  const person = input.person?.trim() || null;

  await prisma.task.update({
    where: { id },
    data: {
      name,
      description: input.description?.trim() || null,
      person,
      initials: initialsOf(person || name),
      ...(input.start && input.end
        ? {
            startDate: new Date(`${input.start}T00:00:00`),
            endDate: new Date(`${input.end}T00:00:00`),
          }
        : {}),
    },
  });

  revalidatePath("/");
}

export async function updateTaskDates(id: string, start: string, end: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.task.update({
    where: { id },
    data: {
      startDate: new Date(`${start}T00:00:00`),
      endDate: new Date(`${end}T00:00:00`),
    },
  });

  revalidatePath("/");
}

export interface ImportJiraCsvResult {
  tasks: number;
  subtasks: number;
}

export async function importJiraCsv(boardId: string, csvText: string): Promise<ImportJiraCsvResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!csvText.trim()) throw new Error("No CSV data provided");

  const tasks = parseJiraCsvToTasks(csvText);
  if (tasks.length === 0) throw new Error("No importable issues found in that CSV");

  const startingOrder = await prisma.task.count({ where: { boardId } });

  for (const [taskIndex, t] of tasks.entries()) {
    await prisma.task.create({
      data: {
        name: t.name,
        description: t.description,
        person: t.person,
        initials: initialsOf(t.person || t.name),
        status: t.status,
        order: startingOrder + taskIndex,
        boardId,
        startDate: t.startDate,
        endDate: t.endDate,
        subtasks: {
          create: t.subtasks.map((s, subtaskIndex) => ({
            name: s.name,
            description: s.description,
            person: s.person,
            initials: initialsOf(s.person || s.name),
            start: s.start,
            end: s.end,
            status: s.status,
            order: subtaskIndex,
          })),
        },
      },
    });
  }

  revalidatePath("/");

  return {
    tasks: tasks.length,
    subtasks: tasks.reduce((sum, t) => sum + t.subtasks.length, 0),
  };
}
