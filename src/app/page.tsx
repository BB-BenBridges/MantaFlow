import { GanttApp } from "@/components/GanttApp";
import { getProjects } from "@/server/projects";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await getProjects();
  return <GanttApp projects={projects} />;
}
