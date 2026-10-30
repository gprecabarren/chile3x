"use client";

import { useRef, useState, type DragEvent } from "react";
import "./media-file-drop.css";

type DropKind = "profile" | "image" | "video";

/** File picker and drag/drop feed the same selection/validation function.
 * Ignore text/link drags; prevent the browser from navigating to local files. */
export function useMediaFileDrop({ disabled, onFiles, onError }: {
  disabled: boolean;
  onFiles: (files: File[], kind?: DropKind) => void;
  onError: (message: string) => void;
}) {
  const [draggingFiles, setDraggingFiles] = useState(false), depth = useRef(0);
  const isFileDrag = (event: DragEvent<HTMLElement>) => Array.from(event.dataTransfer.types).includes("Files");
  return {
    draggingFiles,
    handlers: {
      onDragEnter(event: DragEvent<HTMLElement>) {
        if (!isFileDrag(event)) return;
        event.preventDefault(); depth.current += 1; setDraggingFiles(true);
      },
      onDragLeave(event: DragEvent<HTMLElement>) {
        if (!isFileDrag(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDraggingFiles(false);
      },
      onDragOver(event: DragEvent<HTMLElement>) {
        if (!isFileDrag(event)) return;
        event.preventDefault(); event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      },
      onDrop(event: DragEvent<HTMLElement>) {
        if (!isFileDrag(event)) return;
        event.preventDefault(); event.stopPropagation(); depth.current = 0; setDraggingFiles(false);
        if (disabled) { onError("No puedes agregar archivos durante un proceso o mientras el almacenamiento esté bloqueado. Revisa el aviso de esta sección."); return; }
        const files = Array.from(event.dataTransfer.files);
        if (!files.length) { onError("Arrastra archivos de imagen o video desde tu equipo; las carpetas no se pueden cargar."); return; }
        const section = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-media-kind]") : null;
        const kind = section?.dataset.mediaKind;
        onFiles(files, kind === "profile" || kind === "image" || kind === "video" ? kind : undefined);
      },
    },
  };
}
