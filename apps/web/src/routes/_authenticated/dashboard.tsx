import { createFileRoute } from "@tanstack/react-router";
import { BoardList } from "@/components/board-list";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard | Zentis" }],
  }),
  component: BoardList,
});
