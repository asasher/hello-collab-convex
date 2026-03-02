"use client";

import { api } from "@/convex/_generated/api";
import type {
  ClientUser,
  FieldPath,
  PresenceData,
  PresenceEditor,
} from "@/lib/collaboration/types";
import usePresence from "@convex-dev/presence/react";
import { useMutation } from "convex/react";
import {
  createContext,
  type CSSProperties,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import uniqolor from "uniqolor";

const PRESENCE_ROOM = "appStateEditor";
const PRESENCE_HEARTBEAT_MS = 5_000;

type CollaborationContextValue = {
  currentUser: ClientUser;
  activeField: FieldPath | null;
  setActiveField: (path: FieldPath | null) => void;
  getEditors: (path: FieldPath) => PresenceEditor[];
  registerFieldPath: (path: FieldPath) => void;
};

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

function createClientUser(): ClientUser {
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

function isPresenceData(data: unknown): data is PresenceData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as {
    userName?: unknown;
    editingFieldPath?: unknown;
  };

  if (typeof candidate.userName !== "string") {
    return false;
  }

  return (
    candidate.editingFieldPath === null ||
    typeof candidate.editingFieldPath === "string"
  );
}

export function CollaborationProvider({ children }: PropsWithChildren) {
  const [currentUser] = useState(createClientUser);
  const [activeField, setActiveFieldState] = useState<FieldPath | null>(null);
  const knownFieldPathsRef = useRef(new Set<FieldPath>());
  const warnedUnknownPathsRef = useRef(new Set<FieldPath>());
  const lastPresencePayloadRef = useRef<string | null>(null);

  const presenceState = usePresence(
    api.presence,
    PRESENCE_ROOM,
    currentUser.id,
    PRESENCE_HEARTBEAT_MS,
  );
  const updatePresenceData = useMutation(api.presence.updateRoomUser);

  const isCurrentUserOnline = useMemo(
    () =>
      (presenceState ?? []).some(
        (presence) => presence.userId === currentUser.id && presence.online,
      ),
    [presenceState, currentUser.id],
  );

  useEffect(() => {
    if (!isCurrentUserOnline) {
      lastPresencePayloadRef.current = null;
    }
  }, [isCurrentUserOnline]);

  const registerFieldPath = useCallback((path: FieldPath) => {
    knownFieldPathsRef.current.add(path);
  }, []);

  const warnUnknownPath = useCallback((path: FieldPath) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    if (knownFieldPathsRef.current.has(path)) {
      return;
    }
    if (warnedUnknownPathsRef.current.has(path)) {
      return;
    }

    warnedUnknownPathsRef.current.add(path);
    console.warn(
      `[collaboration] Unknown field path "${path}". Register the path with useCollaborativeField to prevent presence typos.`,
    );
  }, []);

  const setActiveField = useCallback(
    (path: FieldPath | null) => {
      if (path !== null) {
        warnUnknownPath(path);
      }
      setActiveFieldState(path);
    },
    [warnUnknownPath],
  );

  useEffect(() => {
    if (!isCurrentUserOnline) {
      return;
    }

    const payload: PresenceData = {
      userName: currentUser.name,
      editingFieldPath: activeField,
    };
    const serializedPayload = JSON.stringify(payload);
    if (lastPresencePayloadRef.current === serializedPayload) {
      return;
    }

    lastPresencePayloadRef.current = serializedPayload;
    void updatePresenceData({
      roomId: PRESENCE_ROOM,
      userId: currentUser.id,
      data: payload,
    }).catch((error) => {
      console.error("Failed to update presence data", error);
      lastPresencePayloadRef.current = null;
    });
  }, [activeField, currentUser.id, currentUser.name, isCurrentUserOnline, updatePresenceData]);

  const editorsByField = useMemo(() => {
    const map = new Map<FieldPath, PresenceEditor[]>();

    for (const row of presenceState ?? []) {
      if (!row.online || row.userId === currentUser.id || !isPresenceData(row.data)) {
        continue;
      }
      if (row.data.editingFieldPath === null) {
        continue;
      }

      const colorInfo = uniqolor(row.userId, { format: "hex" });
      const existing = map.get(row.data.editingFieldPath) ?? [];
      existing.push({
        userId: row.userId,
        userName: row.data.userName,
        color: colorInfo.color,
        isLight: colorInfo.isLight,
      });
      map.set(row.data.editingFieldPath, existing);
    }

    return map;
  }, [currentUser.id, presenceState]);

  const getEditors = useCallback(
    (path: FieldPath) => editorsByField.get(path) ?? [],
    [editorsByField],
  );

  const value = useMemo<CollaborationContextValue>(
    () => ({
      currentUser,
      activeField,
      setActiveField,
      getEditors,
      registerFieldPath,
    }),
    [activeField, currentUser, getEditors, registerFieldPath, setActiveField],
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const value = useContext(CollaborationContext);
  if (!value) {
    throw new Error("useCollaboration must be used inside CollaborationProvider");
  }

  return value;
}

export function useCollaborativeField(fieldPath: FieldPath) {
  const { registerFieldPath, getEditors, setActiveField } = useCollaboration();

  useEffect(() => {
    registerFieldPath(fieldPath);
  }, [fieldPath, registerFieldPath]);

  const editors = getEditors(fieldPath);
  const hasEditors = editors.length > 0;
  const outlineStyle: CSSProperties | undefined = hasEditors
    ? { outlineColor: editors[0]?.color }
    : undefined;

  const setFieldActive = useCallback(() => {
    setActiveField(fieldPath);
  }, [fieldPath, setActiveField]);

  const clearFieldActive = useCallback(() => {
    setActiveField(null);
  }, [setActiveField]);

  return {
    editors,
    hasEditors,
    outlineStyle,
    setFieldActive,
    clearFieldActive,
  };
}
