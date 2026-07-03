"use client";

import { useState, useTransition } from "react";
import { Modal, TextInput, Button, Stack, Group } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useRouter } from "next/navigation";
import { createProject } from "@/server/actions";
import { RichTextInput } from "./RichTextInput";

interface NewProjectModalProps {
  opened: boolean;
  onClose: () => void;
}

export function NewProjectModal({ opened, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [person, setPerson] = useState("");
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setPerson("");
    setStart(null);
    setEnd(null);
    setError(null);
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    if (!start || !end) {
      setError("Start and end dates are required");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createProject({ name, description, person, start, end });
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New project"
      size="lg"
    >
      <Stack gap="sm">
        <TextInput
          label="Title"
          placeholder="Cloud Migration"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={error && !name.trim() ? error : undefined}
          data-autofocus
        />
        <RichTextInput
          label="Description"
          placeholder="Optional summary of the project"
          value={description}
          onChange={setDescription}
        />
        <TextInput
          label="Responsible person"
          placeholder="Aisha Rahman"
          value={person}
          onChange={(e) => setPerson(e.currentTarget.value)}
        />
        <Group grow>
          <DateInput label="Start date" value={start} onChange={setStart} valueFormat="YYYY-MM-DD" />
          <DateInput label="End date" value={end} onChange={setEnd} valueFormat="YYYY-MM-DD" />
        </Group>
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={pending}>
            Create project
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
