"use client";

import { useCollaborativeField } from "@/components/collaboration/collaboration-provider";
import { EditorBadges } from "@/components/collaboration/editor-badges";
import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

type CollaborativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> & {
  fieldPath: string;
  label: string;
  errorMessage?: string;
  onValueChange: (value: string) => void;
  onValueBlur?: () => void;
};

export function CollaborativeTextarea({
  fieldPath,
  label,
  errorMessage,
  onValueChange,
  onValueBlur,
  className,
  ...textareaProps
}: CollaborativeTextareaProps) {
  const { editors, hasEditors, outlineStyle, setFieldActive, clearFieldActive } =
    useCollaborativeField(fieldPath);

  return (
    <label
      className={cn(
        "relative block space-y-2 rounded-md p-1",
        hasEditors && "outline outline-2 outline-offset-2",
      )}
      style={outlineStyle}
    >
      <EditorBadges editors={editors} />
      <span className="text-sm font-medium">{label}</span>
      <textarea
        {...textareaProps}
        onFocus={(event) => {
          setFieldActive();
          textareaProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          clearFieldActive();
          onValueBlur?.();
          textareaProps.onBlur?.(event);
        }}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        className={cn(
          "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      />
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </label>
  );
}
