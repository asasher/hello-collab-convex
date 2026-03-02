"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import uniqolor from "uniqolor";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import useSingleFlight from "@/hooks/useSingleFlight";
import { cn } from "@/lib/utils";

type AppState = {
  projectName: string;
  ownerName: string;
  ownerEmail: string;
  headline: string;
  statusText: string;
  shortSummary: string;
  longDescription: string;
  notes: string;
  selectedTags: string[];
};

type TextFieldKey = Exclude<keyof AppState, "selectedTags">;
type AppStatePatch = Partial<AppState>;
type PresenceField = keyof AppState;
type PresenceUpdateArgs = {
  room: string;
  userId: string;
  userName: string;
  editingField: PresenceField | null;
};
type PresenceEditor = {
  userId: string;
  userName: string;
  color: string;
  isLight: boolean;
};

const statusTextOptions = ["Draft", "Reviewing", "Live"] as const;
const statusTextOptionSet = new Set(
  statusTextOptions.map((option) => option.toLowerCase()),
);

const ownerEmailSchema = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 || z.email().safeParse(trimmed).success;
  },
  { message: "Enter a valid email address" },
);

const statusTextSchema = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    return (
      trimmed.length === 0 ||
      statusTextOptionSet.has(trimmed.toLowerCase())
    );
  },
  {
    message: `Status must be one of: ${statusTextOptions.join(", ")}`,
  },
);

const appStateFormSchema = z.object({
  projectName: z.string(),
  ownerName: z.string(),
  ownerEmail: ownerEmailSchema,
  headline: z.string(),
  statusText: statusTextSchema,
  shortSummary: z.string(),
  longDescription: z.string(),
  notes: z.string(),
});

type AppStateFormValues = z.infer<typeof appStateFormSchema>;

const PRESENCE_ROOM = "appStateEditor";
const PRESENCE_HEARTBEAT_MS = 5_000;

const textFields: Array<{
  key: TextFieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  {
    key: "projectName",
    label: "Project Name",
    placeholder: "Kitchen Sink State Demo",
  },
  { key: "ownerName", label: "Owner Name", placeholder: "Alex Example" },
  {
    key: "ownerEmail",
    label: "Owner Email",
    placeholder: "alex@example.com",
  },
  {
    key: "headline",
    label: "Headline",
    placeholder: "All your app state in one JSON document",
  },
  {
    key: "statusText",
    label: "Status Text",
    placeholder: "Draft / Reviewing / Live",
  },
  {
    key: "shortSummary",
    label: "Short Summary",
    placeholder: "High-level summary for the UI",
    multiline: true,
  },
  {
    key: "longDescription",
    label: "Long Description",
    placeholder: "Detailed description and context",
    multiline: true,
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "Free-form notes",
    multiline: true,
  },
];

const tagOptions = [
  "Marketing",
  "Product",
  "Engineering",
  "Sales",
  "Design",
  "Ops",
  "Finance",
  "Legal",
] as const;

const presenceFields: PresenceField[] = [...textFields.map((f) => f.key), "selectedTags"];
const presenceFieldSet = new Set<PresenceField>(presenceFields);

function isPresenceField(value: string): value is PresenceField {
  return presenceFieldSet.has(value as PresenceField);
}

function createClientUser() {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const shortId = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const colorInfo = uniqolor(id, { format: "hex" });

  return {
    id,
    name: `User ${shortId}`,
    color: colorInfo.color,
    isLight: colorInfo.isLight,
  };
}

function isValidOwnerEmail(value: string) {
  return ownerEmailSchema.safeParse(value).success;
}

function normalizeStatusText(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const canonical = statusTextOptions.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );
  return canonical ?? trimmed;
}

function isValidStatusText(value: string) {
  return statusTextSchema.safeParse(value).success;
}

export default function HomePage() {
  const [currentUser] = useState(createClientUser);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [editingField, setEditingField] = useState<PresenceField | null>(null);
  const {
    control,
    setValue,
    clearErrors,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<AppStateFormValues>({
    resolver: zodResolver(appStateFormSchema),
    mode: "onChange",
    defaultValues: {
      projectName: "",
      ownerName: "",
      ownerEmail: "",
      headline: "",
      statusText: "",
      shortSummary: "",
      longDescription: "",
      notes: "",
    },
  });
  const formValues = useWatch({ control });

  const appState = useQuery(api.appState.get);
  const presenceResult = useQuery(api.presence.list, { room: PRESENCE_ROOM });

  const updateAppState = useMutation(api.appState.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.appState.get, {});
      if (!current) {
        return;
      }

      localStore.setQuery(api.appState.get, {}, {
        ...current,
        ...args.patch,
      });
    },
  );
  const writePresenceMutation = useMutation(api.presence.upsert);
  const writePresence = useSingleFlight(
    useCallback(
      (args: PresenceUpdateArgs) => writePresenceMutation(args),
      [writePresenceMutation],
    ),
  );

  const queuePresence = useCallback(
    (field: PresenceField | null) => {
      void writePresence({
        room: PRESENCE_ROOM,
        userId: currentUser.id,
        userName: currentUser.name,
        editingField: field,
      }).catch((error) => {
        console.error("Failed to write presence", error);
      });
    },
    [currentUser.id, currentUser.name, writePresence],
  );

  useEffect(() => {
    queuePresence(editingField);
  }, [editingField, queuePresence]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      queuePresence(editingField);
    }, PRESENCE_HEARTBEAT_MS);

    return () => clearInterval(intervalId);
  }, [editingField, queuePresence]);

  function patchState(patch: AppStatePatch) {
    void updateAppState({ patch });
  }

  function patchTextField(field: TextFieldKey, value: string) {
    patchState({ [field]: value } as AppStatePatch);
  }

  function patchValidatedField(field: TextFieldKey, value: string) {
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
    if (field === "statusText") {
      const normalizedStatus = normalizeStatusText(value);
      if (isValidStatusText(normalizedStatus)) {
        patchTextField(field, normalizedStatus);
      }
      return;
    }

    if (field !== "ownerEmail") {
      patchTextField(field, value);
      return;
    }

    const normalizedEmail = value.trim();
    if (isValidOwnerEmail(normalizedEmail)) {
      patchTextField(field, normalizedEmail);
    }
  }

  async function validateAndPersistEmail() {
    const isValid = await trigger("ownerEmail");
    if (!isValid) {
      return;
    }

    const normalizedEmail = getValues("ownerEmail").trim();
    setValue("ownerEmail", normalizedEmail, {
      shouldDirty: true,
      shouldValidate: true,
    });
    patchTextField("ownerEmail", normalizedEmail);
  }

  async function validateAndPersistStatusText() {
    const isValid = await trigger("statusText");
    if (!isValid) {
      return;
    }

    const normalizedStatus = normalizeStatusText(getValues("statusText"));
    setValue("statusText", normalizedStatus, {
      shouldDirty: true,
      shouldValidate: true,
    });
    patchTextField("statusText", normalizedStatus);
  }

  function validateAndPersistField(field: TextFieldKey) {
    if (field === "ownerEmail") {
      void validateAndPersistEmail();
      return;
    }
    if (field === "statusText") {
      void validateAndPersistStatusText();
    }
  }

  function toggleTag(tag: string) {
    if (!appState) {
      return;
    }

    const nextTags = appState.selectedTags.includes(tag)
      ? appState.selectedTags.filter((existingTag) => existingTag !== tag)
      : [...appState.selectedTags, tag];

    patchState({ selectedTags: nextTags });
  }

  const editorsByField = useMemo(() => {
    const presence = presenceResult ?? [];
    const map = new Map<PresenceField, PresenceEditor[]>();
    for (const field of presenceFields) {
      map.set(field, []);
    }

    for (const row of presence) {
      if (row.userId === currentUser.id || row.editingField === null) {
        continue;
      }
      if (!isPresenceField(row.editingField)) {
        continue;
      }

      const colorInfo = uniqolor(row.userId, { format: "hex" });
      const editors = map.get(row.editingField);
      if (!editors) {
        continue;
      }
      editors.push({
        userId: row.userId,
        userName: row.userName,
        color: colorInfo.color,
        isLight: colorInfo.isLight,
      });
    }

    return map;
  }, [presenceResult, currentUser.id]);

  const selectedTagEditors = editorsByField.get("selectedTags") ?? [];

  useEffect(() => {
    if (!appState) {
      return;
    }

    for (const field of textFields) {
      if (field.key === editingField) {
        continue;
      }
      setValue(field.key, appState[field.key], {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      clearErrors(field.key);
    }
  }, [appState, editingField, setValue, clearErrors]);

  if (!appState) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">App State</h1>
        <p className="text-sm text-muted-foreground">Loading app state...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">App State</h1>
        <p className="text-muted-foreground">
          Single JSON-like Convex state document with optimistic updates.
        </p>
        <p className="text-xs text-muted-foreground">
          You are{" "}
          <span
            className="rounded px-1 py-0.5 font-medium"
            style={{
              backgroundColor: currentUser.color,
              color: currentUser.isLight ? "#0f172a" : "#f8fafc",
            }}
          >
            {currentUser.name}
          </span>
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {textFields.map((field) => {
            const editors = editorsByField.get(field.key) ?? [];
            const outlineStyle =
              editors.length > 0
                ? ({
                    outlineColor: editors[0].color,
                  } as const)
                : undefined;

            return (
              <label
                key={field.key}
                className={cn(
                  "relative block space-y-2 rounded-md p-1",
                  editors.length > 0 && "outline outline-2 outline-offset-2",
                )}
                style={outlineStyle}
              >
                {editors.length > 0 ? (
                  <div className="pointer-events-none absolute -top-2 right-2 flex flex-wrap gap-1">
                    {editors.map((editor) => (
                      <span
                        key={editor.userId}
                        className="rounded px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: editor.color,
                          color: editor.isLight ? "#0f172a" : "#f8fafc",
                        }}
                      >
                        {editor.userName}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="text-sm font-medium">{field.label}</span>
                {field.multiline ? (
                  <textarea
                    value={formValues[field.key] ?? ""}
                    onFocus={() => setEditingField(field.key)}
                    onBlur={() => {
                      setEditingField(null);
                      validateAndPersistField(field.key);
                    }}
                    onChange={(event) =>
                      patchValidatedField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    rows={4}
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : (
                  <input
                    value={formValues[field.key] ?? ""}
                    onFocus={() => setEditingField(field.key)}
                    onBlur={() => {
                      setEditingField(null);
                      validateAndPersistField(field.key);
                    }}
                    onChange={(event) =>
                      patchValidatedField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    aria-invalid={errors[field.key] ? true : undefined}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
                {errors[field.key] ? (
                  <p className="text-xs text-destructive">
                    {errors[field.key]?.message}
                  </p>
                ) : null}
              </label>
            );
          })}

          <div
            className={cn(
              "relative space-y-2 rounded-md p-1",
              selectedTagEditors.length > 0 && "outline outline-2 outline-offset-2",
            )}
            style={
              selectedTagEditors.length > 0
                ? {
                    outlineColor: selectedTagEditors[0]?.color,
                  }
                : undefined
            }
          >
            {selectedTagEditors.length > 0 ? (
              <div className="pointer-events-none absolute -top-2 right-2 flex flex-wrap gap-1">
                {selectedTagEditors.map((editor) => (
                  <span
                    key={editor.userId}
                    className="rounded px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: editor.color,
                      color: editor.isLight ? "#0f172a" : "#f8fafc",
                    }}
                  >
                    {editor.userName}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-sm font-medium">Tags</p>
            <Popover
              open={tagsOpen}
              onOpenChange={(open) => {
                setTagsOpen(open);
                setEditingField(open ? "selectedTags" : null);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tagsOpen}
                  className="w-full justify-between"
                  onFocus={() => setEditingField("selectedTags")}
                  onBlur={() => {
                    if (!tagsOpen) {
                      setEditingField(null);
                    }
                  }}
                >
                  {appState.selectedTags.length > 0
                    ? `${appState.selectedTags.length} selected`
                    : "Select tags"}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder="Find tags..." />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {tagOptions.map((tag) => {
                        const isSelected = appState.selectedTags.includes(tag);
                        return (
                          <CommandItem
                            key={tag}
                            onSelect={() => toggleTag(tag)}
                            className="gap-2"
                          >
                            <Check
                              className={cn(
                                "size-4",
                                isSelected ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {tag}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {appState.selectedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {appState.selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="inline-flex h-7 items-center rounded-md border border-border bg-muted px-2 text-xs font-medium hover:bg-muted/80"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">Live App State JSON</p>
          <pre className="max-h-[560px] overflow-auto rounded-md bg-background p-3 text-xs">
            {JSON.stringify(appState, null, 2)}
          </pre>
        </aside>
      </section>
    </main>
  );
}
