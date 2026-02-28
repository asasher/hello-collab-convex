import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const STALE_PRESENCE_MS = 15_000;

export const list = query({
  args: { room: v.string() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - STALE_PRESENCE_MS;
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_room", (q) => q.eq("room", args.room))
      .collect();

    return rows.filter((row) => row.updatedAt >= cutoff);
  },
});

export const upsert = mutation({
  args: {
    room: v.string(),
    userId: v.string(),
    userName: v.string(),
    editingField: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_room_user", (q) =>
        q.eq("room", args.room).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userName: args.userName,
        editingField: args.editingField,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.insert("presence", {
      room: args.room,
      userId: args.userId,
      userName: args.userName,
      editingField: args.editingField,
      createdAt: now,
      updatedAt: now,
    });
  },
});
