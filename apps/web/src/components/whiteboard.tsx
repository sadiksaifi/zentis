import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";
import { client } from "@/utils/orpc";
import { toast } from "sonner";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface WhiteboardProps {
  boardId: string;
  initialElements: string;
  initialAppState: string;
  initialFiles: string | null;
  title: string;
  onTitleChange: (title: string) => void;
}

export function Whiteboard({
  boardId,
  initialElements,
  initialAppState,
  initialFiles,
  title,
  onTitleChange,
}: WhiteboardProps) {
  const { theme } = useTheme();
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
          canvasActions: {
            toggleTheme: false,
            export: false,
          },
        }}
      />
    </div>
  );
}
