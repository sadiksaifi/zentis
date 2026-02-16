import { createFileRoute } from "@tanstack/react-router";
import { BoardList } from "@/components/board-list";

export const Route = createFileRoute("/_authenticated/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <BoardList />;
}
