import * as React from "react";
import { HelpCircle, Play, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

export type ScriptSegment =
  | { type: "text"; value: string }
  | { type: "chip"; id: string; label: string };

export interface ScriptComposerHandle {
  /** Insert a styled motion chip at the current caret position. */
  insertChip: (id: string, label: string) => void;
  /** Read the editor content serialized to plain text (chips become `[MOTION id:1]` tags). */
  getSerializedScript: () => string;
  /** Clear the editor and rebuild its content from the given segments. */
  replaceSegments: (segments: ScriptSegment[]) => void;
}

export interface ScriptComposerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "onCopy"> {
  defaultSegments?: ScriptSegment[];
  placeholder?: string;
  onSend?: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

/**
 * Serialize the inline content of a single line (a top-level text/chip run,
 * or the contents of a block element such as a browser-inserted <div>/<p>).
 * A lone <br> is the browser's placeholder for an empty line and should not
 * itself introduce a newline; any other <br> is a soft line break.
 */
function serializeInlineContent(node: HTMLElement): string {
  if (
    node.childNodes.length === 1 &&
    node.firstChild instanceof HTMLElement &&
    node.firstChild.tagName === "BR"
  ) {
    return "";
  }

  let text = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? "";
    } else if (child instanceof HTMLElement && child.dataset.chip) {
      text += `[MOTION ${child.dataset.chip}:1]`;
    } else if (child instanceof HTMLElement && child.tagName === "BR") {
      text += "\n";
    } else if (child instanceof HTMLElement) {
      text += serializeInlineContent(child);
    }
  });
  return text;
}

/**
 * Serialize the editor's full content back to plain text.
 * contentEditable typically wraps each new line (created via Enter) in its
 * own block element (<div>/<p>) rather than concatenating text nodes, so
 * each top-level block/BR boundary must become an explicit "\n" — otherwise
 * adjacent lines collapse together (e.g. "Hello" + "World" -> "Helloworld").
 */
function serializeEditor(editor: HTMLDivElement): string {
  const lines: string[] = [];
  let current = "";

  editor.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += node.textContent ?? "";
    } else if (node instanceof HTMLElement && node.dataset.chip) {
      current += `[MOTION ${node.dataset.chip}:1]`;
    } else if (node instanceof HTMLElement && node.tagName === "BR") {
      lines.push(current);
      current = "";
    } else if (node instanceof HTMLElement) {
      // Browsers wrap each new line (from Enter) in a block element.
      lines.push(current);
      current = serializeInlineContent(node);
    }
  });

  lines.push(current);
  return lines.join("\n").trim();
}

const CHIP_CLASS =
  "mx-0.5 inline-flex items-center rounded-full px-1.5 align-baseline bg-[var(--color-info-main-16)] text-body2 text-info-dark";

function createChip(id: string, label: string) {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.className = CHIP_CLASS;
  span.textContent = label;
  span.setAttribute("data-chip", id);
  return span;
}

export const ScriptComposer = React.forwardRef<
  ScriptComposerHandle,
  ScriptComposerProps
>(function ScriptComposer(
  {
    defaultSegments = [],
    placeholder = "Type your script here...",
    onSend,
    className,
    ...props
  },
  ref,
) {
  const editorRef = React.useRef<HTMLDivElement>(null);

  // Seed the editor with `defaultSegments` exactly once, on first mount.
  // Subsequent changes to `defaultSegments` are intentionally ignored — this
  // is an *initial* value, not a controlled prop. Callers that need to
  // repopulate the editor after mount (e.g. when the selected avatar changes)
  // must use the imperative `replaceSegments` handle instead.
  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.dataset.initialized) return;
    editor.dataset.initialized = "true";
    for (const segment of defaultSegments) {
      if (segment.type === "text") {
        editor.appendChild(document.createTextNode(segment.value));
      } else {
        editor.appendChild(createChip(segment.id, segment.label));
        editor.appendChild(document.createTextNode("\u00A0"));
      }
    }
  }, [defaultSegments]);

  const insertChip = React.useCallback((id: string, label: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    let range: Range;
    if (
      selection &&
      selection.rangeCount > 0 &&
      editor.contains(selection.anchorNode)
    ) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.deleteContents();
    const fragment = document.createDocumentFragment();
    fragment.appendChild(createChip(id, label));
    const trailingSpace = document.createTextNode("\u00A0");
    fragment.appendChild(trailingSpace);
    range.insertNode(fragment);

    // Place the caret right after the inserted chip + space.
    range.setStartAfter(trailingSpace);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const reset = React.useCallback((segments: ScriptSegment[]) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = "";
    for (const segment of segments) {
      if (segment.type === "text") {
        editor.appendChild(document.createTextNode(segment.value));
      } else {
        editor.appendChild(createChip(segment.id, segment.label));
        editor.appendChild(document.createTextNode("\u00A0"));
      }
    }
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      insertChip,
      getSerializedScript: () =>
        editorRef.current ? serializeEditor(editorRef.current) : "",
      replaceSegments: reset,
    }),
    [insertChip, reset],
  );

  const handleSend = () => {
    const text = editorRef.current ? serializeEditor(editorRef.current) : "";

    onSend?.(text);
  };

  const handleCopy = () => {
    const text = editorRef.current ? serializeEditor(editorRef.current) : "";
    void navigator.clipboard.writeText(text).catch((error: unknown) => {
      console.error("[ScriptComposer] failed to copy script", error);
      toast.error("Failed to copy script.");
    });
  };

  return (
    <div className={cn("flex w-full flex-col gap-3", className)} {...props}>
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <h2 className="text-h6 text-foreground">Sample script</h2>
        <span className="group relative">
          <HelpCircle className="size-4" />
          <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 hidden w-[240px] -translate-x-1/2 rounded-lg bg-grey-900 px-3 py-2 text-[12px] leading-[16px] text-white shadow-lg group-hover:block">
            Type a line and insert a motion tag copied from Motion Studio to
            control when the avatar performs that action.
          </span>
        </span>
      </div>

      {/* Editable field with inline chips */}
      <div
        className={cn(
          "relative rounded-3xl border border-white/60 bg-[var(--color-overlay-white-56)] p-5",
          "shadow-[0_0_80px_0_rgba(0,0,0,0.1)]",
        )}
      >
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Script"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className={cn(
            "min-h-[169px] whitespace-pre-wrap break-words pr-12 outline-none",
            "text-[16px] leading-[26px] text-common-black",
            "[&:empty]:before:pointer-events-none [&:empty]:before:text-grey-500 [&:empty]:before:content-[attr(data-placeholder)]",
          )}
        />

        {/* Send button */}
        <button
          type="button"
          aria-label="Play script"
          onClick={handleSend}
          className={cn(
            "absolute bottom-5 right-5 flex size-9 items-center justify-center rounded-full",
            "bg-slate-700 text-grey-600 transition-colors hover:bg-slate-700/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          <Play className="size-4 fill-current text-white" />
        </button>

        {/* Copy button */}
        <button
          type="button"
          aria-label="Copy script"
          onClick={handleCopy}
          className={cn(
            "absolute bottom-5 right-[72px] flex size-9 items-center justify-center rounded-full",
            "bg-slate-700 text-grey-600 transition-colors hover:bg-slate-700/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          <Copy className="size-4 text-white" />
        </button>
      </div>
    </div>
  );
});
