import type { PresenceEditor } from "@/lib/collaboration/types";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type CollaborativeFieldChromeStyle = CSSProperties & {
  "--editor-badge-bg"?: string;
  "--editor-badge-fg"?: string;
};

type CollaborativeFieldChrome = {
  className: string;
  style: CollaborativeFieldChromeStyle | undefined;
  badgeText: string | undefined;
};

type CollaborativeFieldChromeOptions = {
  className?: string;
  editors: PresenceEditor[];
  outlineStyle?: CSSProperties;
};

function getBadgeText(editors: PresenceEditor[]) {
  const leadEditor = editors[0];
  if (!leadEditor) {
    return undefined;
  }

  if (editors.length === 1) {
    return leadEditor.userName;
  }

  return `${leadEditor.userName} +${editors.length - 1}`;
}

export function getCollaborativeFieldChrome({
  className,
  editors,
  outlineStyle,
}: CollaborativeFieldChromeOptions): CollaborativeFieldChrome {
  const leadEditor = editors[0];
  const hasEditors = editors.length > 0;
  const style: CollaborativeFieldChromeStyle = {
    ...(outlineStyle ?? {}),
  };

  if (leadEditor) {
    style["--editor-badge-bg"] = leadEditor.color;
    style["--editor-badge-fg"] = leadEditor.isLight ? "#0f172a" : "#f8fafc";
  }

  return {
    className: cn(
      "relative space-y-2 rounded-md p-1",
      hasEditors &&
        "outline outline-offset-2 before:pointer-events-none before:absolute before:-top-2 before:right-2 before:rounded before:px-2 before:py-0.5 before:text-[10px] before:font-medium before:content-[attr(data-editor-badge)] before:bg-[var(--editor-badge-bg)] before:text-[var(--editor-badge-fg)]",
      className,
    ),
    style: Object.keys(style).length === 0 ? undefined : style,
    badgeText: getBadgeText(editors),
  };
}
