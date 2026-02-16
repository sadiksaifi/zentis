import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { client } from "@/utils/orpc";
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
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const parsedElements = JSON.parse(initialElements);
  const parsedAppState = JSON.parse(initialAppState);
  const parsedFiles = initialFiles ? JSON.parse(initialFiles) : undefined;

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const elementsJson = JSON.stringify(elements);
        const appStateSubset = JSON.stringify({
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
        });

        // Skip save if nothing changed
        const fingerprint = `${elementsJson.length}:${elements.length}`;
        if (fingerprint === lastSavedRef.current) return;
        lastSavedRef.current = fingerprint;

        client.board.update({
          id: boardId,
          elements: elementsJson,
          appState: appStateSubset,
          files: files ? JSON.stringify(files) : null,
        });
      }, 500);
    },
    [boardId],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
