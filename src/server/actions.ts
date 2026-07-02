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
