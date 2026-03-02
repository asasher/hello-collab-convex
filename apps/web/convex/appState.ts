import { mutation, query } from "./_generated/server";
import { z } from "zod";
import {
  APP_STATE_KEY,
  type AppState,
  type AppStatePatch,
  appStatePatchValidator,
  defaultAppState,
} from "./appStateModel";

const statusTextOptions = ["Draft", "Reviewing", "Live"] as const;
const statusTextOptionSet = new Set(
  statusTextOptions.map((option) => option.toLowerCase()),
);

const ownerEmailSchema = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 || z.email().safeParse(trimmed).success;
  },
  { message: "owner.email must be a valid email address" },
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
    message: `project.statusText must be one of: ${statusTextOptions.join(", ")}`,
  },
);

type LegacyAppState = {
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

function isLegacyAppState(state: unknown): state is LegacyAppState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const candidate = state as Record<string, unknown>;
  return (
    typeof candidate.projectName === "string" &&
    typeof candidate.ownerName === "string" &&
    typeof candidate.ownerEmail === "string" &&
    typeof candidate.headline === "string" &&
    typeof candidate.statusText === "string" &&
    typeof candidate.shortSummary === "string" &&
    typeof candidate.longDescription === "string" &&
    typeof candidate.notes === "string" &&
    Array.isArray(candidate.selectedTags) &&
    candidate.selectedTags.every((value) => typeof value === "string")
  );
}

function isNestedAppState(state: unknown): state is AppState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const candidate = state as Record<string, unknown>;
  const project = candidate.project as Record<string, unknown> | undefined;
  const owner = candidate.owner as Record<string, unknown> | undefined;
  const content = candidate.content as Record<string, unknown> | undefined;

  return (
    !!project &&
    typeof project.name === "string" &&
    typeof project.headline === "string" &&
    typeof project.statusText === "string" &&
    Array.isArray(project.selectedTags) &&
    project.selectedTags.every((value) => typeof value === "string") &&
    !!owner &&
    typeof owner.name === "string" &&
    typeof owner.email === "string" &&
    !!content &&
    typeof content.shortSummary === "string" &&
    typeof content.longDescription === "string" &&
    typeof content.notes === "string"
  );
}

function normalizeStoredState(state: unknown): AppState {
  if (isNestedAppState(state)) {
    return state;
  }
  if (isLegacyAppState(state)) {
    return {
      project: {
        name: state.projectName,
        headline: state.headline,
        statusText: state.statusText,
        selectedTags: state.selectedTags,
      },
      owner: {
        name: state.ownerName,
        email: state.ownerEmail,
      },
      content: {
        shortSummary: state.shortSummary,
        longDescription: state.longDescription,
        notes: state.notes,
      },
    };
  }

  return defaultAppState;
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

export const get = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", APP_STATE_KEY))
      .unique();

    return normalizeStoredState(doc?.state);
  },
});

export const update = mutation({
  args: { patch: appStatePatchValidator },
  handler: async (ctx, args) => {
    const patch: AppStatePatch = {
      project: args.patch.project ? { ...args.patch.project } : undefined,
      owner: args.patch.owner ? { ...args.patch.owner } : undefined,
      content: args.patch.content ? { ...args.patch.content } : undefined,
    };
    if (patch.owner?.email !== undefined) {
      const normalizedEmail = patch.owner.email.trim();
      const parsedEmail = ownerEmailSchema.safeParse(normalizedEmail);
      if (!parsedEmail.success) {
        throw new Error(parsedEmail.error.issues[0]?.message ?? "Invalid email");
      }
      patch.owner.email = normalizedEmail;
    }
    if (patch.project?.statusText !== undefined) {
      const normalizedStatus = normalizeStatusText(patch.project.statusText);
      const parsedStatus = statusTextSchema.safeParse(normalizedStatus);
      if (!parsedStatus.success) {
        throw new Error(parsedStatus.error.issues[0]?.message ?? "Invalid statusText");
      }
      patch.project.statusText = normalizedStatus;
    }

    const doc = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", APP_STATE_KEY))
      .unique();

    const now = Date.now();
    const currentState: AppState = normalizeStoredState(doc?.state);
    const nextState: AppState = {
      project: {
        ...currentState.project,
        ...(patch.project ?? {}),
      },
      owner: {
        ...currentState.owner,
        ...(patch.owner ?? {}),
      },
      content: {
        ...currentState.content,
        ...(patch.content ?? {}),
      },
    };

    if (doc) {
      await ctx.db.patch(doc._id, {
        state: nextState,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appState", {
        key: APP_STATE_KEY,
        state: nextState,
        createdAt: now,
        updatedAt: now,
      });
    }

    return nextState;
  },
});
