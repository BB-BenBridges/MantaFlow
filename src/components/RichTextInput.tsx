"use client";

import { useEffect } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { RichTextEditor } from "@mantine/tiptap";
import { Input } from "@mantine/core";

const EMPTY_DOC = "<p></p>";

interface RichTextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (html: string) => void;
}

export function RichTextInput({ label, placeholder, value, onChange }: RichTextInputProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link, Placeholder.configure({ placeholder })],
    content: value || EMPTY_DOC,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === EMPTY_DOC ? "" : html);
    },
  });

  // The description modals stay mounted across submissions (e.g. NewTaskModal
  // resets its fields without unmounting), so the editor's own content needs to
  // be resynced whenever the parent resets `value` out from under it.
  useEffect(() => {
    if (!editor) return;
    const normalized = value || EMPTY_DOC;
    if (editor.getHTML() !== normalized) editor.commands.setContent(normalized);
  }, [value, editor]);

  return (
    <Input.Wrapper label={label}>
      <RichTextEditor editor={editor} className="rich-text-input">
        <RichTextEditor.Toolbar>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Input.Wrapper>
  );
}
