import { GanttApp } from "@/components/GanttApp";
import { getBoards, getTasks } from "@/server/tasks";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board: boardParam } = await searchParams;
  const boards = await getBoards();
  const currentBoard = boards.find((b) => b.id === boardParam) ?? boards[0];
  const tasks = currentBoard ? await getTasks(currentBoard.id) : [];

  return <GanttApp boards={boards} currentBoardId={currentBoard?.id ?? ""} tasks={tasks} />;
}
