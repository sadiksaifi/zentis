import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { client } from "@/utils/orpc";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { formatRelativeDate } from "@/lib/format";

export function BoardList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => client.board.list(),
  });

  const createBoard = useMutation({
    mutationFn: () => client.board.create({}),
    onSuccess: (data) => {
      navigate({ to: "/board/$boardId", params: { boardId: data.id } });
    },
    onError: () => {
      toast.error("Failed to create board");
    },
  });

  const deleteBoard = useMutation({
    mutationFn: (id: string) => client.board.delete({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted");
    },
    onError: () => {
      toast.error("Failed to delete board");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 pt-16 pb-8">
      {/* New board section */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Start a new whiteboard
        </h2>
        <button
          onClick={() => createBoard.mutate()}
          disabled={createBoard.isPending}
          className="flex h-32 w-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-card transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <Plus className="size-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Blank</span>
        </button>
      </section>

      {/* Recent boards */}
      {boards && boards.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Recent whiteboards
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {boards.map((b) => (
              <div
                key={b.id}
                className="group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
                onClick={() =>
                  navigate({
                    to: "/board/$boardId",
                    params: { boardId: b.id },
                  })
                }
              >
                {/* Thumbnail area */}
                <div className="flex h-28 items-center justify-center bg-muted/50">
                  {b.thumbnailDataUrl ? (
                    <img
                      src={b.thumbnailDataUrl}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-2xl text-muted-foreground/30">
                      &#9998;
                    </div>
                  )}
                </div>

                {/* Info area */}
                <div className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(b.updatedAt)}
                    </p>
                  </div>

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBoard.mutate(b.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {boards && boards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No whiteboards yet</p>
          <p className="text-sm text-muted-foreground/70">
            Click "Blank" above to create your first one
          </p>
        </div>
      )}
    </div>
  );
}
