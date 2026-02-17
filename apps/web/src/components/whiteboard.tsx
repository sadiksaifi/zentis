import { Excalidraw, MainMenu, Sidebar } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "@/components/theme-provider";
import { client } from "@/utils/orpc";
import { toast } from "sonner";
import { Plus, FolderOpen, LayoutDashboard, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarBoardItem } from "@/components/sidebar-board-item";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface BoardSummary {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface WhiteboardProps {
  boardId: string;
  initialElements: string;
  initialAppState: string;
  initialFiles: string | null;
  title: string;
  onTitleChange: (title: string) => void;
  boards: BoardSummary[];
  onNavigate: (boardId: string) => void;
}

export function Whiteboard({
  boardId,
  initialElements,
  initialAppState,
  initialFiles,
  title,
  onTitleChange,
  boards,
  onNavigate,
}: WhiteboardProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const latestStateRef = useRef<{
    elements: string;
    appState: string;
    files: string | null;
  } | null>(null);

  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const parsedElements = JSON.parse(initialElements);
  const parsedAppState = JSON.parse(initialAppState);
  const parsedFiles = initialFiles ? JSON.parse(initialFiles) : undefined;

  const saveToServer = useCallback(
    async (state: { elements: string; appState: string; files: string | null }) => {
      try {
        await client.board.update({
          id: boardId,
          elements: state.elements,
          appState: state.appState,
          files: state.files,
        });
        queryClient.setQueryData(["board", boardId], (old: any) =>
          old ? { ...old, ...state } : old,
        );
      } catch {
        toast.error("Failed to save board changes");
      }
    },
    [boardId, queryClient],
  );

  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (latestStateRef.current) {
      const state = latestStateRef.current;
      latestStateRef.current = null;
      client.board.update({
        id: boardId,
        elements: state.elements,
        appState: state.appState,
        files: state.files,
      });
      queryClient.setQueryData(["board", boardId], (old: any) =>
        old ? { ...old, ...state } : old,
      );
    }
  }, [boardId, queryClient]);

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const elementsJson = JSON.stringify(elements);
      const appStateSubset = JSON.stringify({
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemStrokeColor: appState.currentItemStrokeColor,
        currentItemBackgroundColor: appState.currentItemBackgroundColor,
      });
      const filesJson = files ? JSON.stringify(files) : null;

      // Skip save if nothing changed
      const fingerprint = `${elementsJson.length}:${elements.length}`;
      if (fingerprint === lastSavedRef.current) return;

      const state = { elements: elementsJson, appState: appStateSubset, files: filesJson };
      latestStateRef.current = state;

      saveTimeoutRef.current = setTimeout(() => {
        lastSavedRef.current = fingerprint;
        latestStateRef.current = null;
        saveToServer(state);
      }, 500);
    },
    [saveToServer],
  );

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (latestStateRef.current) {
        const state = latestStateRef.current;
        latestStateRef.current = null;
        // Fire-and-forget on unmount — best effort
        client.board.update({
          id: boardId,
          elements: state.elements,
          appState: state.appState,
          files: state.files,
        });
        queryClient.setQueryData(["board", boardId], (old: any) =>
          old ? { ...old, ...state } : old,
        );
      }
    };
  }, [boardId, queryClient]);

  const createBoard = useMutation({
    mutationFn: () => client.board.create({}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      onNavigate(data.id);
    },
    onError: () => {
      toast.error("Failed to create board");
    },
  });

  const handleBoardClick = useCallback(
    (targetBoardId: string) => {
      if (targetBoardId === boardId) return;
      flushPendingSave();
      onNavigate(targetBoardId);
    },
    [boardId, flushPendingSave, onNavigate],
  );

  return (
    <div className="fixed inset-0 z-0">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: parsedElements,
          appState: {
            ...parsedAppState,
          },
          files: parsedFiles,
        }}
        onChange={handleChange}
        theme={resolvedTheme}
        UIOptions={{
          dockedSidebarBreakpoint: 0,
        }}
        renderTopRightUI={() => (
          <Sidebar.Trigger
            name="files"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FolderOpen className="size-4! aspect-square!"/>
          </Sidebar.Trigger>
        )}
      >
        <MainMenu>
          <MainMenu.Item
            icon={<LayoutDashboard className="size-4" />}
            onSelect={() => navigate({ to: "/dashboard" })}
          >
            Dashboard
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Item
            icon={<LogOut className="size-4" />}
            onSelect={() =>
              authClient.signOut().then(() => navigate({ to: "/" }))
            }
          >
            Sign out
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.ItemCustom>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span>Theme</span>
              <ModeToggle />
            </div>
          </MainMenu.ItemCustom>
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
        <Sidebar name="files" docked={true}>
          <Sidebar.Header>Files</Sidebar.Header>
          <div className="flex flex-col gap-1 p-2">
            <button
              onClick={() => createBoard.mutate()}
              disabled={createBoard.isPending}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-mid)]"
              style={{ color: "var(--color-primary)" }}
            >
              <Plus className="size-4" />
              New board
            </button>
            <div
              className="my-1"
              style={{
                height: 1,
                background: "var(--color-surface-mid)",
              }}
            />
            <div className="flex flex-col gap-0.5 overflow-y-auto">
              {boards.map((b) => (
                <SidebarBoardItem
                  key={b.id}
                  board={b}
                  isActive={b.id === boardId}
                  onBoardClick={handleBoardClick}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        </Sidebar>
      </Excalidraw>
    </div>
  );
}
