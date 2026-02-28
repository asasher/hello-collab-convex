import { v } from "convex/values";

export const APP_STATE_KEY = "main";

export const appStateShape = {
  projectName: v.string(),
  ownerName: v.string(),
  ownerEmail: v.string(),
  headline: v.string(),
  statusText: v.string(),
  shortSummary: v.string(),
  longDescription: v.string(),
  notes: v.string(),
  selectedTags: v.array(v.string()),
};

export const appStateValidator = v.object(appStateShape);

export const appStatePatchValidator = v.object({
  projectName: v.optional(v.string()),
  ownerName: v.optional(v.string()),
  ownerEmail: v.optional(v.string()),
  headline: v.optional(v.string()),
  statusText: v.optional(v.string()),
  shortSummary: v.optional(v.string()),
  longDescription: v.optional(v.string()),
  notes: v.optional(v.string()),
  selectedTags: v.optional(v.array(v.string())),
});

export const defaultAppState = {
  projectName: "",
  ownerName: "",
  ownerEmail: "",
  headline: "",
  statusText: "",
  shortSummary: "",
  longDescription: "",
  notes: "",
  selectedTags: [],
} satisfies {
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

export type AppState = typeof defaultAppState;
