import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Whiteboard } from "@/components/whiteboard";
import { client } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Loader from "@/components/loader";

export const Route = createFileRoute("/_authenticated/board/$boardId")({
  component: BoardComponent,
});

function BoardComponent() {
  const { boardId } = Route.useParams();
  const navigate = useNavigate();

  const {
    data: board,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => client.board.get({ id: boardId }),
  });

  const { data: boards } = useQuery({
    queryKey: ["boards"],
    queryFn: () => client.board.list(),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !board) {
    toast.error("Board not found");
    return null;
  }

  return (
    <Whiteboard
      boardId={board.id}
      initialElements={board.elements}
      initialAppState={board.appState}
      initialFiles={board.files}
      title={board.title}
      onTitleChange={(title) => {
        client.board.update({ id: board.id, title });
      }}
      boards={boards ?? []}
      onNavigate={(id) =>
        navigate({ to: "/board/$boardId", params: { boardId: id } })
      }
    />
  );
}
