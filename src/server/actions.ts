"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { initialsOf } from "@/lib/initials";
import { parseJiraCsvToProjects } from "@/lib/jira-import";

export interface CreateProjectInput {
  name: string;
  description?: string;
  person?: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export async function createProject(input: CreateProjectInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Project name is required");

  const count = await prisma.project.count();

  await prisma.project.create({
    data: {
      name,
      description: input.description?.trim() || null,
      person: input.person?.trim() || null,
      initials: initialsOf(input.person?.trim() || name),
      status: "idle",
      order: count,
      startDate: new Date(`${input.start}T00:00:00`),
      endDate: new Date(`${input.end}T00:00:00`),
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
      start: new Date(`${start}T00:00:00`),
      end: new Date(`${end}T00:00:00`),
    },
  });

  revalidatePath("/");
}

export interface UpdateTaskInput {
  name: string;
  description?: string;
  person?: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
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
      start: new Date(`${input.start}T00:00:00`),
      end: new Date(`${input.end}T00:00:00`),
    },
  });

  revalidatePath("/");
}

export async function updateTaskProgress(id: string, progress: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.task.update({
    where: { id },
    data: { progress: Math.max(0, Math.min(100, Math.round(progress))) },
  });

  revalidatePath("/");
}

export interface UpdateProjectInput {
  name: string;
  description?: string;
  person?: string;
  // Omitted for a project with child tasks, since its span is a rollup
  // computed from those tasks rather than a value stored on the project.
  start?: string;
  end?: string;
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Project name is required");

  const person = input.person?.trim() || null;

  await prisma.project.update({
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

export async function updateProjectDates(id: string, start: string, end: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.project.update({
    where: { id },
    data: {
      startDate: new Date(`${start}T00:00:00`),
      endDate: new Date(`${end}T00:00:00`),
    },
  });

  revalidatePath("/");
}

export interface ImportJiraCsvResult {
  projects: number;
  tasks: number;
}

export async function importJiraCsv(csvText: string): Promise<ImportJiraCsvResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!csvText.trim()) throw new Error("No CSV data provided");

  const projects = parseJiraCsvToProjects(csvText);
  if (projects.length === 0) throw new Error("No importable issues found in that CSV");

  const startingOrder = await prisma.project.count();

  for (const [projectIndex, p] of projects.entries()) {
    await prisma.project.create({
      data: {
        name: p.name,
        person: p.person,
        initials: initialsOf(p.person || p.name),
        status: p.status,
        order: startingOrder + projectIndex,
        startDate: p.startDate,
        endDate: p.endDate,
        tasks: {
          create: p.tasks.map((t, taskIndex) => ({
            name: t.name,
            person: t.person,
            initials: initialsOf(t.person || t.name),
            start: t.start,
            end: t.end,
            progress: t.progress,
            order: taskIndex,
          })),
        },
      },
    });
  }

  revalidatePath("/");

  return {
    projects: projects.length,
    tasks: projects.reduce((sum, p) => sum + p.tasks.length, 0),
  };
}
