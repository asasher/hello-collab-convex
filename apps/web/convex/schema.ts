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
  presence: defineTable({
    room: v.string(),
    userId: v.string(),
    userName: v.string(),
    editingField: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_room", ["room"])
    .index("by_room_user", ["room", "userId"]),
});
