"use client";

import { getCollaborativeFieldChrome } from "@/components/collaboration/collaborative-field-chrome";
import { useCollaborativeField } from "@/components/collaboration/collaboration-provider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useId, type TextareaHTMLAttributes } from "react";

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
  const { editors, outlineStyle, setFieldActive, clearFieldActive } =
    useCollaborativeField(fieldPath);
  const generatedId = useId();
  const textareaId = textareaProps.id ?? generatedId;
  const errorId = errorMessage ? `${textareaId}-error` : undefined;
  const describedBy = [textareaProps["aria-describedby"], errorId]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const fieldChrome = getCollaborativeFieldChrome({
    className: "block",
    editors,
    outlineStyle,
  });

  return (
    <div
      className={fieldChrome.className}
      style={fieldChrome.style}
      data-editor-badge={fieldChrome.badgeText}
    >
      <Label htmlFor={textareaId}>{label}</Label>
      <Textarea
        {...textareaProps}
        id={textareaId}
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
        aria-describedby={describedBy || undefined}
        aria-invalid={errorMessage ? true : textareaProps["aria-invalid"]}
        className={className}
      />
      {errorMessage ? (
        <p id={errorId} className="text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
