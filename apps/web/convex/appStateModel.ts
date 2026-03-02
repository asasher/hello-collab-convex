import { v } from "convex/values";

export const APP_STATE_KEY = "main";

export const appStateShape = {
  project: v.object({
    name: v.string(),
    headline: v.string(),
    statusText: v.string(),
    selectedTags: v.array(v.string()),
  }),
  owner: v.object({
    name: v.string(),
    email: v.string(),
  }),
  content: v.object({
    shortSummary: v.string(),
    longDescription: v.string(),
    notes: v.string(),
  }),
};

export const appStateValidator = v.object(appStateShape);

export const appStatePatchValidator = v.object({
  project: v.optional(
    v.object({
      name: v.optional(v.string()),
      headline: v.optional(v.string()),
      statusText: v.optional(v.string()),
      selectedTags: v.optional(v.array(v.string())),
    }),
  ),
  owner: v.optional(
    v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  ),
  content: v.optional(
    v.object({
      shortSummary: v.optional(v.string()),
      longDescription: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  ),
});

export type AppState = {
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

export type AppStatePatch = {
  project?: Partial<AppState["project"]>;
  owner?: Partial<AppState["owner"]>;
  content?: Partial<AppState["content"]>;
};

export const defaultAppState: AppState = {
  project: {
    name: "",
    headline: "",
    statusText: "",
    selectedTags: [],
  },
  owner: {
    name: "",
    email: "",
  },
  content: {
    shortSummary: "",
    longDescription: "",
    notes: "",
  },
};
