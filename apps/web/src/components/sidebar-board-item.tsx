import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { client } from "@/utils/orpc";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Share2, Download, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { shareBoard } from "@/lib/share";
import { downloadBoard } from "@/lib/download";
import { cn } from "@/lib/utils";

interface BoardSummary {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface SidebarBoardItemProps {
  board: BoardSummary;
  isActive: boolean;
  onBoardClick: (id: string) => void;
  onNavigate: (id: string) => void;
}

export function SidebarBoardItem({
  board,
  isActive,
  onBoardClick,
  onNavigate,
}: SidebarBoardItemProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isRenaming, setIsRenaming] = useState(false);
  const [editValue, setEditValue] = useState(board.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const renameMutation = useMutation({
    mutationFn: (newTitle: string) => client.board.update({ id: board.id, title: newTitle }),
    onMutate: async (newTitle: string) => {
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previous = queryClient.getQueryData<BoardSummary[]>(["boards"]);
      queryClient.setQueryData<BoardSummary[]>(["boards"], (old) =>
        old?.map((b) => (b.id === board.id ? { ...b, title: newTitle } : b)),
      );
      queryClient.setQueryData(["board", board.id], (old: any) =>
        old ? { ...old, title: newTitle } : old,
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      queryClient.setQueryData(["boards"], ctx?.previous);
      toast.error("Failed to rename board");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.board.delete({ id }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previous = queryClient.getQueryData<BoardSummary[]>(["boards"]);
      queryClient.setQueryData<BoardSummary[]>(["boards"], (old) =>
        old?.filter((b) => b.id !== id),
      );
      if (id === board.id && isActive) {
        const remaining = previous?.filter((b) => b.id !== id) ?? [];
        if (remaining.length > 0) {
          onNavigate(remaining[0].id);
        } else {
          navigate({ to: "/dashboard" });
        }
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(["boards"], ctx?.previous);
      toast.error("Failed to delete board");
    },
    onSuccess: () => toast.success("Board deleted"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === board.title) {
      setEditValue(board.title);
      setIsRenaming(false);
      return;
    }
    renameMutation.mutate(trimmed);
    setIsRenaming(false);
  }, [editValue, board.title, renameMutation]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitRename();
      } else if (e.key === "Escape") {
        setEditValue(board.title);
        setIsRenaming(false);
      }
    },
    [commitRename, board.title],
  );

  const startRename = useCallback(() => {
    setEditValue(board.title);
    setIsRenaming(true);
  }, [board.title]);

  const handleShare = useCallback(() => {
    shareBoard(board.id);
  }, [board.id]);

  const handleDownload = useCallback(async () => {
    try {
      const fullBoard = await client.board.get({ id: board.id });
      downloadBoard({
        title: fullBoard.title,
        elements: fullBoard.elements,
        appState: fullBoard.appState,
        files: fullBoard.files,
      });
    } catch {
      toast.error("Failed to download board");
    }
  }, [board.id]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(board.id);
  }, [board.id, deleteMutation]);

  function MenuItems({
    as: ItemComponent,
    SeparatorComponent,
  }: {
    as: React.ComponentType<any>;
    SeparatorComponent: React.ComponentType<any>;
  }) {
    return (
      <>
        <ItemComponent onClick={startRename}>
          <Pencil className="size-4" />
          Rename
        </ItemComponent>
        <ItemComponent onClick={handleShare}>
          <Share2 className="size-4" />
          Share
        </ItemComponent>
        <ItemComponent onClick={handleDownload}>
          <Download className="size-4" />
          Download
        </ItemComponent>
        <SeparatorComponent />
        <ItemComponent variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" />
          Delete
        </ItemComponent>
      </>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex w-full" render={<div />}>
        <button
          onClick={() => !isRenaming && onBoardClick(board.id)}
          className={cn(
            `group flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-mid)]`,
            isRenaming && "border-2 border-[var(--color-primary)]",
          )}
          style={{
            background: isActive ? "var(--color-surface-mid)" : undefined,
            fontWeight: isActive ? 600 : 400,
            color: "var(--color-on-surface)",
          }}
        >
          {isRenaming ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              className="w-full truncate bg-transparent text-sm border-none focus-visible:shadow-none!"
              style={{ color: "var(--color-on-surface)" }}
            />
          ) : (
            <>
              <span className="truncate flex-1">{board.title}</span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--color-surface-high)] group-hover:opacity-100"
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" sideOffset={4}>
                  <MenuItems as={DropdownMenuItem} SeparatorComponent={DropdownMenuSeparator} />
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <MenuItems as={ContextMenuItem} SeparatorComponent={ContextMenuSeparator} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
