import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { appStateValidator } from "./appStateModel";

export default defineSchema({
  appState: defineTable({
    key: v.string(),
    state: appStateValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
