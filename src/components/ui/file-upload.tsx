"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  className?: string;
}

export function FileUpload({
  onUpload,
  accept,
  maxSize = 10,
  label = "Upload File",
  className,
}: FileUploadProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSize * 1024 * 1024;

  function validateFile(f: File): boolean {
    setError(null);

    // Check file size
    if (f.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSize}MB limit.`);
      return false;
    }

    // Check file type
    if (accept) {
      const acceptedTypes = accept.split(",").map((t) => t.trim());
      const fileExt = `.${f.name.split(".").pop()?.toLowerCase()}`;
      const fileMime = f.type;

      const isValid = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return fileExt === type.toLowerCase();
        }
        if (type.endsWith("/*")) {
          return fileMime.startsWith(type.replace("/*", "/"));
        }
        return fileMime === type;
      });

      if (!isValid) {
        setError(`Invalid file type. Accepted: ${accept}`);
        return false;
      }
    }

    return true;
  }

  function handleFile(f: File) {
    if (validateFile(f)) {
      setFile(f);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }

  function handleRemove() {
    setFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleUpload() {
    if (file) {
      onUpload(file);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Drop zone */}
      {!file && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
          )}
        >
          <Upload className="size-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag & drop or click to browse
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Max size: {maxSize}MB
              {accept && ` | ${accept}`}
            </p>
          </div>
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <FileText className="size-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleUpload}
            >
              <Upload className="mr-1 size-3.5" />
              Upload
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
