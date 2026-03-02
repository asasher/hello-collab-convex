export type FieldPath = string;

export type PresenceData = {
  userName: string;
  editingFieldPath: FieldPath | null;
};

export type PresenceEditor = {
  userId: string;
  userName: string;
  color: string;
  isLight: boolean;
};

export type ClientUser = {
  id: string;
  name: string;
  color: string;
  isLight: boolean;
};
