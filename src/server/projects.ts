import "server-only";
import { prisma } from "@/lib/prisma";
import type { BoardDTO, ProjectDTO } from "@/lib/types";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getBoards(): Promise<BoardDTO[]> {
  const boards = await prisma.board.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return boards.map((b) => ({ id: b.id, name: b.name }));
}

export async function getProjects(boardId: string): Promise<ProjectDTO[]> {
  const projects = await prisma.project.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    person: p.person,
    initials: p.initials,
    status: p.status,
    startDate: p.startDate ? toDateStr(p.startDate) : null,
    endDate: p.endDate ? toDateStr(p.endDate) : null,
    tasks: p.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      person: t.person,
      initials: t.initials,
      start: toDateStr(t.start),
      end: toDateStr(t.end),
      status: t.status,
    })),
  }));
}
