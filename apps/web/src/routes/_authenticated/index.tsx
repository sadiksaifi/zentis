import { createFileRoute, redirect } from "@tanstack/react-router";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: async () => {
    const boards = await client.board.list();
    if (boards.length > 0) {
      throw redirect({
        to: "/board/$boardId",
        params: { boardId: boards[0].id },
      });
    }
    throw redirect({ to: "/dashboard" });
  },
});
