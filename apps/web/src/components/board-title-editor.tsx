import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import { toast } from "sonner";

interface BoardSummary {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface BoardTitleEditorProps {
  boardId: string;
  title: string;
}

export function BoardTitleEditor({ boardId, title }: BoardTitleEditorProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external title changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(title);
    }
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const renameMutation = useMutation({
    mutationFn: (newTitle: string) =>
      client.board.update({ id: boardId, title: newTitle }),
    onMutate: async (newTitle: string) => {
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previous = queryClient.getQueryData<BoardSummary[]>(["boards"]);
      queryClient.setQueryData<BoardSummary[]>(["boards"], (old) =>
        old?.map((b) => (b.id === boardId ? { ...b, title: newTitle } : b)),
      );
      queryClient.setQueryData(["board", boardId], (old: any) =>
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

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === title) {
      setEditValue(title);
      setIsEditing(false);
      return;
    }
    renameMutation.mutate(trimmed);
    setIsEditing(false);
  }, [editValue, title, renameMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        commitRename();
      } else if (e.key === "Escape") {
        setEditValue(title);
        setIsEditing(false);
      }
    },
    [commitRename, title],
  );

  if (isEditing) {
    return (
      <div className="board-title-editor">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="h-full px-2 text-sm font-medium bg-transparent border-0 border-b-[0.5px] border-[var(--color-primary)] outline-none max-w-[200px]"
          style={{ color: "var(--color-on-surface)" }}
        />
      </div>
    );
  }

  return (
    <div className="board-title-editor">
      <button
        onDoubleClick={() => setIsEditing(true)}
        onPointerDown={(e) => e.stopPropagation()}
        title={title}
        className="h-full rounded px-2 text-sm font-medium truncate max-w-[200px] bg-transparent border-none cursor-default hover:bg-[var(--color-surface-lowest)]"
        style={{ color: "var(--color-on-surface)" }}
      >
        {title}
      </button>
    </div>
  );
}
