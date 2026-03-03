"use client";

import { getCollaborativeFieldChrome } from "@/components/collaboration/collaborative-field-chrome";
import { useCollaborativeField } from "@/components/collaboration/collaboration-provider";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

type CollaborativeMultiSelectProps = {
  fieldPath: string;
  label: string;
  options: readonly string[];
  selectedValues: string[];
  onToggleValue: (value: string) => void;
  triggerPlaceholder?: string;
  searchPlaceholder?: string;
};

export function CollaborativeMultiSelect({
  fieldPath,
  label,
  options,
  selectedValues,
  onToggleValue,
  triggerPlaceholder = "Select options",
  searchPlaceholder = "Find option...",
}: CollaborativeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { editors, outlineStyle, setFieldActive, clearFieldActive } =
    useCollaborativeField(fieldPath);
  const fieldChrome = getCollaborativeFieldChrome({
    editors,
    outlineStyle,
  });

  return (
    <div
      className={fieldChrome.className}
      style={fieldChrome.style}
      data-editor-badge={fieldChrome.badgeText}
    >
      <Label>{label}</Label>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setFieldActive();
          } else {
            clearFieldActive();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            onFocus={() => setFieldActive()}
            onBlur={() => {
              if (!open) {
                clearFieldActive();
              }
            }}
          >
            {selectedValues.length > 0
              ? `${selectedValues.length} selected`
              : triggerPlaceholder}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option);
                  return (
                    <CommandItem
                      key={option}
                      onSelect={() => onToggleValue(option)}
                      className="gap-2"
                    >
                      <Check
                        className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      {option}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedValues.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleValue(tag)}
              className="inline-flex h-7 items-center rounded-md border border-border bg-muted px-2 text-xs font-medium hover:bg-muted/80"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
