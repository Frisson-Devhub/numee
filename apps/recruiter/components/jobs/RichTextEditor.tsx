"use client";

import { useEffect, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-brand-primary text-surface shadow-sm"
          : "text-foreground-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <span
      aria-hidden
      className="mx-1 hidden h-5 w-px bg-border-default sm:inline-block"
    />
  );
}

function EditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border-default bg-surface-muted px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        disabled={disabled}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        disabled={disabled}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        disabled={disabled}
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Heading 2"
        disabled={disabled}
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        disabled={disabled}
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Bullet list"
        disabled={disabled}
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        disabled={disabled}
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        disabled={disabled}
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Clear formatting"
        disabled={disabled}
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>
      <div className="ml-auto flex items-center gap-0.5">
        <ToolbarButton
          label="Undo"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}

/**
 * TipTap HTML editor for job description fields. Emits empty string when the
 * doc is empty; `immediatelyRender: false` avoids SSR hydration mismatch.
 */
export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder = "Write the full job description…",
  id,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        id: id ?? "job-description-editor",
        class:
          "tiptap rich-text-content min-h-[16rem] px-4 py-3 text-sm focus:outline-none text-foreground",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current && !(editor.isEmpty && !next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center rounded-xl border border-border-default bg-surface-muted text-sm text-foreground-subtle">
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border-default bg-surface shadow-sm focus-within:ring-2 focus-within:ring-focus-ring ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <EditorToolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}
