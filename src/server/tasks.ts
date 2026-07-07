import "server-only";
import { prisma } from "@/lib/prisma";
import type { BoardDTO, TaskDTO } from "@/lib/types";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getBoards(): Promise<BoardDTO[]> {
  const boards = await prisma.board.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return boards.map((b) => ({ id: b.id, name: b.name }));
}

export async function getTasks(boardId: string): Promise<TaskDTO[]> {
  const tasks = await prisma.task.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });

  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    person: t.person,
    initials: t.initials,
    status: t.status,
    startDate: t.startDate ? toDateStr(t.startDate) : null,
    endDate: t.endDate ? toDateStr(t.endDate) : null,
    subtasks: t.subtasks.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      person: s.person,
      initials: s.initials,
      start: toDateStr(s.start),
      end: toDateStr(s.end),
      status: s.status,
    })),
  }));
}
