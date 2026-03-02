"use client";

import { CollaborativeInput } from "@/components/collaboration/collaborative-input";
import { CollaborativeMultiSelect } from "@/components/collaboration/collaborative-multi-select";
import { CollaborativeTextarea } from "@/components/collaboration/collaborative-textarea";
import { useCollaboration } from "@/components/collaboration/collaboration-provider";
import { api } from "@/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

type AppState = {
  project: {
    name: string;
    headline: string;
    statusText: string;
    selectedTags: string[];
  };
  owner: {
    name: string;
    email: string;
  };
  content: {
    shortSummary: string;
    longDescription: string;
    notes: string;
  };
};

type AppStatePatch = {
  project?: Partial<AppState["project"]>;
  owner?: Partial<AppState["owner"]>;
  content?: Partial<AppState["content"]>;
};

type FormFieldKey =
  | "projectName"
  | "ownerName"
  | "ownerEmail"
  | "headline"
  | "statusText"
  | "shortSummary"
  | "longDescription"
  | "notes";

type TextFieldPath =
  | "project.name"
  | "owner.name"
  | "owner.email"
  | "project.headline"
  | "project.statusText"
  | "content.shortSummary"
  | "content.longDescription"
  | "content.notes";

type TextFieldConfig = {
  formKey: FormFieldKey;
  path: TextFieldPath;
  label: string;
  placeholder: string;
  multiline?: boolean;
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

const textFields: TextFieldConfig[] = [
  {
    formKey: "projectName",
    path: "project.name",
    label: "Project Name",
    placeholder: "Kitchen Sink State Demo",
  },
  {
    formKey: "ownerName",
    path: "owner.name",
    label: "Owner Name",
    placeholder: "Alex Example",
  },
  {
    formKey: "ownerEmail",
    path: "owner.email",
    label: "Owner Email",
    placeholder: "alex@example.com",
  },
  {
    formKey: "headline",
    path: "project.headline",
    label: "Headline",
    placeholder: "All your app state in one JSON document",
  },
  {
    formKey: "statusText",
    path: "project.statusText",
    label: "Status Text",
    placeholder: "Draft / Reviewing / Live",
  },
  {
    formKey: "shortSummary",
    path: "content.shortSummary",
    label: "Short Summary",
    placeholder: "High-level summary for the UI",
    multiline: true,
  },
  {
    formKey: "longDescription",
    path: "content.longDescription",
    label: "Long Description",
    placeholder: "Detailed description and context",
    multiline: true,
  },
  {
    formKey: "notes",
    path: "content.notes",
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

function getTextFieldValue(state: AppState, path: TextFieldPath): string {
  switch (path) {
    case "project.name":
      return state.project.name;
    case "owner.name":
      return state.owner.name;
    case "owner.email":
      return state.owner.email;
    case "project.headline":
      return state.project.headline;
    case "project.statusText":
      return state.project.statusText;
    case "content.shortSummary":
      return state.content.shortSummary;
    case "content.longDescription":
      return state.content.longDescription;
    case "content.notes":
      return state.content.notes;
  }
}

function patchForTextField(path: TextFieldPath, value: string): AppStatePatch {
  switch (path) {
    case "project.name":
      return { project: { name: value } };
    case "owner.name":
      return { owner: { name: value } };
    case "owner.email":
      return { owner: { email: value } };
    case "project.headline":
      return { project: { headline: value } };
    case "project.statusText":
      return { project: { statusText: value } };
    case "content.shortSummary":
      return { content: { shortSummary: value } };
    case "content.longDescription":
      return { content: { longDescription: value } };
    case "content.notes":
      return { content: { notes: value } };
  }
}

function applyPatch(current: AppState, patch: AppStatePatch): AppState {
  return {
    project: {
      ...current.project,
      ...(patch.project ?? {}),
    },
    owner: {
      ...current.owner,
      ...(patch.owner ?? {}),
    },
    content: {
      ...current.content,
      ...(patch.content ?? {}),
    },
  };
}

export default function HomePage() {
  const { currentUser, activeField } = useCollaboration();
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

  const updateAppState = useMutation(api.appState.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.appState.get, {});
      if (!current) {
        return;
      }

      localStore.setQuery(api.appState.get, {}, applyPatch(current, args.patch));
    },
  );

  function patchState(patch: AppStatePatch) {
    void updateAppState({ patch });
  }

  function patchTextField(path: TextFieldPath, value: string) {
    patchState(patchForTextField(path, value));
  }

  function patchValidatedField(field: TextFieldConfig, value: string) {
    setValue(field.formKey, value, { shouldDirty: true, shouldValidate: true });
    if (field.formKey === "statusText") {
      const normalizedStatus = normalizeStatusText(value);
      if (isValidStatusText(normalizedStatus)) {
        patchTextField(field.path, normalizedStatus);
      }
      return;
    }

    if (field.formKey !== "ownerEmail") {
      patchTextField(field.path, value);
      return;
    }

    const normalizedEmail = value.trim();
    if (isValidOwnerEmail(normalizedEmail)) {
      patchTextField(field.path, normalizedEmail);
    }
  }

  async function validateAndPersistEmail(field: TextFieldConfig) {
    const isValid = await trigger(field.formKey);
    if (!isValid) {
      return;
    }

    const normalizedEmail = getValues(field.formKey).trim();
    setValue(field.formKey, normalizedEmail, {
      shouldDirty: true,
      shouldValidate: true,
    });
    patchTextField(field.path, normalizedEmail);
  }

  async function validateAndPersistStatusText(field: TextFieldConfig) {
    const isValid = await trigger(field.formKey);
    if (!isValid) {
      return;
    }

    const normalizedStatus = normalizeStatusText(getValues(field.formKey));
    setValue(field.formKey, normalizedStatus, {
      shouldDirty: true,
      shouldValidate: true,
    });
    patchTextField(field.path, normalizedStatus);
  }

  function validateAndPersistField(field: TextFieldConfig) {
    if (field.formKey === "ownerEmail") {
      void validateAndPersistEmail(field);
      return;
    }
    if (field.formKey === "statusText") {
      void validateAndPersistStatusText(field);
    }
  }

  function toggleTag(tag: string) {
    if (!appState) {
      return;
    }

    const nextTags = appState.project.selectedTags.includes(tag)
      ? appState.project.selectedTags.filter((existingTag) => existingTag !== tag)
      : [...appState.project.selectedTags, tag];

    patchState({ project: { selectedTags: nextTags } });
  }

  useEffect(() => {
    if (!appState) {
      return;
    }

    for (const field of textFields) {
      if (field.path === activeField) {
        continue;
      }

      setValue(field.formKey, getTextFieldValue(appState, field.path), {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      clearErrors(field.formKey);
    }
  }, [activeField, appState, clearErrors, setValue]);

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
          Single nested Convex state document with optimistic updates.
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
            const maybeMessage = errors[field.formKey]?.message;
            const errorMessage =
              typeof maybeMessage === "string" ? maybeMessage : undefined;

            if (field.multiline) {
              return (
                <CollaborativeTextarea
                  key={field.path}
                  fieldPath={field.path}
                  label={field.label}
                  value={formValues[field.formKey] ?? ""}
                  placeholder={field.placeholder}
                  rows={4}
                  onValueBlur={() => validateAndPersistField(field)}
                  onValueChange={(value) => patchValidatedField(field, value)}
                  errorMessage={errorMessage}
                />
              );
            }

            return (
              <CollaborativeInput
                key={field.path}
                fieldPath={field.path}
                label={field.label}
                type={field.formKey === "ownerEmail" ? "email" : "text"}
                value={formValues[field.formKey] ?? ""}
                placeholder={field.placeholder}
                onValueBlur={() => validateAndPersistField(field)}
                onValueChange={(value) => patchValidatedField(field, value)}
                errorMessage={errorMessage}
              />
            );
          })}

          <CollaborativeMultiSelect
            fieldPath="project.selectedTags"
            label="Tags"
            options={tagOptions}
            selectedValues={appState.project.selectedTags}
            onToggleValue={toggleTag}
            triggerPlaceholder="Select tags"
            searchPlaceholder="Find tags..."
          />
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
