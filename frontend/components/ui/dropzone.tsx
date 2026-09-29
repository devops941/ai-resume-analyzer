"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

const ACCEPTED = ".pdf,.docx,.txt";

export function Dropzone({
  onFile,
  file,
  disabled,
}: {
  onFile: (file: File) => void;
  file: File | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        dragging ? "border-indigo-400 bg-indigo-500/10" : "border-[hsl(var(--border))]",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <UploadCloud className="mb-3 h-10 w-10 text-indigo-400" />
      {file ? (
        <>
          <p className="text-sm font-medium text-slate-100">{file.name}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {(file.size / 1024).toFixed(1)} KB · click to replace
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-100">
            Drag & drop your resume here
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            or click to browse · PDF, DOCX or TXT up to 5 MB
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
