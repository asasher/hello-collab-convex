"use client";

import { getCollaborativeFieldChrome } from "@/components/collaboration/collaborative-field-chrome";
import { useCollaborativeField } from "@/components/collaboration/collaboration-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useId, type InputHTMLAttributes } from "react";

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
  const { editors, outlineStyle, setFieldActive, clearFieldActive } =
    useCollaborativeField(fieldPath);
  const generatedId = useId();
  const inputId = inputProps.id ?? generatedId;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
  const describedBy = [inputProps["aria-describedby"], errorId]
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
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        {...inputProps}
        id={inputId}
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
        aria-describedby={describedBy || undefined}
        aria-invalid={errorMessage ? true : inputProps["aria-invalid"]}
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
