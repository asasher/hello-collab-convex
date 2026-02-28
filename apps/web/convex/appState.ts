import { mutation, query } from "./_generated/server";
import { z } from "zod";
import {
  APP_STATE_KEY,
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
  { message: "ownerEmail must be a valid email address" },
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
    message: `statusText must be one of: ${statusTextOptions.join(", ")}`,
  },
);

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

    return doc?.state ?? defaultAppState;
  },
});

export const update = mutation({
  args: { patch: appStatePatchValidator },
  handler: async (ctx, args) => {
    const patch = { ...args.patch };
    if (patch.ownerEmail !== undefined) {
      const normalizedEmail = patch.ownerEmail.trim();
      const parsedEmail = ownerEmailSchema.safeParse(normalizedEmail);
      if (!parsedEmail.success) {
        throw new Error(parsedEmail.error.issues[0]?.message ?? "Invalid email");
      }
      patch.ownerEmail = normalizedEmail;
    }
    if (patch.statusText !== undefined) {
      const normalizedStatus = normalizeStatusText(patch.statusText);
      const parsedStatus = statusTextSchema.safeParse(normalizedStatus);
      if (!parsedStatus.success) {
        throw new Error(parsedStatus.error.issues[0]?.message ?? "Invalid statusText");
      }
      patch.statusText = normalizedStatus;
    }

    const doc = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", APP_STATE_KEY))
      .unique();

    const now = Date.now();
    const nextState = {
      ...(doc?.state ?? defaultAppState),
      ...patch,
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
