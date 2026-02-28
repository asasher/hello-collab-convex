import { mutation, query } from "./_generated/server";
import {
  APP_STATE_KEY,
  appStatePatchValidator,
  defaultAppState,
} from "./appStateModel";

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
    const doc = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", APP_STATE_KEY))
      .unique();

    const now = Date.now();
    const nextState = {
      ...(doc?.state ?? defaultAppState),
      ...args.patch,
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
