"use client";

import { useState, useTransition } from "react";
import { Modal, Textarea, Button, Stack, Group, Text, FileButton } from "@mantine/core";
import { useRouter } from "next/navigation";
import { importJiraCsv } from "@/server/actions";

interface ImportJiraModalProps {
  opened: boolean;
  boardId: string;
  onClose: () => void;
}

export function ImportJiraModal({ opened, boardId, onClose }: ImportJiraModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCsvText("");
    setFileName(null);
    setError(null);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setCsvText(await file.text());
  }

  function handleImport() {
    if (!csvText.trim()) {
      setError("Choose a CSV file or paste its contents first");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await importJiraCsv(boardId, csvText);
        reset();
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import Jira CSV"
      size="lg"
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Export issues from Jira as CSV, then upload or paste the contents below. Top-level issues become
          tasks; their sub-tasks (and the issue itself) become subtasks on the timeline.
        </Text>
        <FileButton onChange={handleFile} accept=".csv,text/csv">
          {(props) => (
            <Button {...props} variant="default">
              {fileName || "Choose CSV file"}
            </Button>
          )}
        </FileButton>
        <Textarea
          placeholder="…or paste CSV contents here"
          value={csvText}
          onChange={(e) => setCsvText(e.currentTarget.value)}
          autosize
          minRows={6}
          maxRows={12}
        />
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} loading={pending}>
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
