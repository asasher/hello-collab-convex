"use client";

import { useCollaborativeField } from "@/components/collaboration/collaboration-provider";
import { EditorBadges } from "@/components/collaboration/editor-badges";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type CollaborativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> & {
  fieldPath: string;
  label: string;
  errorMessage?: string;
  onValueChange: (value: string) => void;
  onValueBlur?: () => void;
};

export function CollaborativeInput({
  fieldPath,
  label,
  errorMessage,
  onValueChange,
  onValueBlur,
  className,
  ...inputProps
}: CollaborativeInputProps) {
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
      <input
        {...inputProps}
        onFocus={(event) => {
          setFieldActive();
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          clearFieldActive();
          onValueBlur?.();
          inputProps.onBlur?.(event);
        }}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        aria-invalid={errorMessage ? true : inputProps["aria-invalid"]}
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      />
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </label>
  );
}
