import type { PresenceEditor } from "@/lib/collaboration/types";

type EditorBadgesProps = {
  editors: PresenceEditor[];
};

export function EditorBadges({ editors }: EditorBadgesProps) {
  if (editors.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute -top-2 right-2 flex flex-wrap gap-1">
      {editors.map((editor) => (
        <span
          key={editor.userId}
          className="rounded px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: editor.color,
            color: editor.isLight ? "#0f172a" : "#f8fafc",
          }}
        >
          {editor.userName}
        </span>
      ))}
    </div>
  );
}
