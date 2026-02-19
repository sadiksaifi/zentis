import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { client } from "@/utils/orpc";
import { formatRelativeDate } from "@/lib/format";
import { FileText, PenLine, Plus } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: boards } = useQuery({
    queryKey: ["boards"],
    queryFn: () => client.board.list(),
  });

  const createBoard = useMutation({
    mutationFn: () => client.board.create({}),
    onSuccess: (data) => {
      setOpen(false);
      navigate({ to: "/board/$boardId", params: { boardId: data.id } });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }
    }

    function onOpenCommandMenu() {
      setOpen(true);
    }

    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("open-command-menu", onOpenCommandMenu);
    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("open-command-menu", onOpenCommandMenu);
    };
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Menu"
      description="Search boards or create a new one"
    >
      <Command>
        <CommandInput placeholder="Search boards..." />
        <CommandList className="gap-8">
          <CommandEmpty>No boards found.</CommandEmpty>
          <CommandGroup heading="Actions" className="py-4">
            <CommandItem
              onSelect={() => createBoard.mutate()}
              disabled={createBoard.isPending}
            >
              <Plus className="size-4" />
              Create new board
            </CommandItem>
          </CommandGroup>
          {boards && boards.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Boards" className="pt-2">
                {boards.map((board) => (
                  <CommandItem
                    key={board.id}
                    value={board.id}
                    keywords={[board.title]}
                    onSelect={() => {
                      setOpen(false);
                      navigate({
                        to: "/board/$boardId",
                        params: { boardId: board.id },
                      });
                    }}
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground group-data-selected/command-item:hidden" />
                    <PenLine className="hidden size-4 shrink-0 text-muted-foreground group-data-selected/command-item:block" />
                    <span className="min-w-0 flex-1 truncate">{board.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {formatRelativeDate(board.updatedAt)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
