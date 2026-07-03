"use client";

import { useState, useTransition } from "react";
import { Modal, TextInput, Autocomplete, Button, Stack, Group, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useRouter } from "next/navigation";
import { updateTask, updateProject } from "@/server/actions";
import { capitalizeName } from "@/lib/gantt-logic";
import type { GanttChartTask } from "./GanttChart";
import { RichTextInput } from "./RichTextInput";

interface EditItemModalProps {
  item: GanttChartTask;
  owners: string[];
  onClose: () => void;
}

// Mounted only while a bar is being edited (see the `key`-ed usage in
// DesktopBoard), so the initial state below only needs to run once per item
// rather than re-syncing via an effect whenever `item` changes.
export function EditItemModal({ item, owners, onClose }: EditItemModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [person, setPerson] = useState(item.assignee ?? "");
  const [start, setStart] = useState<string | null>(String(item.start));
  const [end, setEnd] = useState<string | null>(String(item.end));
  const [error, setError] = useState<string | null>(null);

  const isTask = item.kind === "task";
  // A project with child tasks shows a span rolled up from those tasks, so
  // its dates aren't a value the user can edit directly here.
  const datesEditable = isTask || !item.hasTasks;

  function handleSubmit() {
    if (!name.trim()) {
      setError(isTask ? "Task name is required" : "Project name is required");
      return;
    }
    if (datesEditable && (!start || !end)) {
      setError("Start and end dates are required");
      return;
    }
    setError(null);
    const responsiblePerson = capitalizeName(person.trim());
    startTransition(async () => {
      if (isTask) {
        await updateTask(item.id, { name, description, person: responsiblePerson, start: start!, end: end! });
      } else {
        await updateProject(item.id, {
          name,
          description,
          person: responsiblePerson,
          ...(datesEditable ? { start: start!, end: end! } : {}),
        });
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal opened onClose={onClose} title={isTask ? "Edit task" : "Edit project"} size="lg">
      <Stack gap="sm">
        <TextInput
          label="Title"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={error && !name.trim() ? error : undefined}
          data-autofocus
        />
        <RichTextInput
          label="Description"
          placeholder={isTask ? "Optional details about this task" : "Optional summary of the project"}
          value={description}
          onChange={setDescription}
        />
        <Autocomplete
          label="Responsible person"
          placeholder="Aisha Rahman"
          data={owners}
          value={person}
          onChange={setPerson}
          onBlur={() => setPerson((p) => capitalizeName(p.trim()))}
        />
        {datesEditable ? (
          <Group grow>
            <DateInput label="Start date" value={start} onChange={setStart} valueFormat="YYYY-MM-DD" />
            <DateInput label="End date" value={end} onChange={setEnd} valueFormat="YYYY-MM-DD" />
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            Start and end dates are computed from this project&apos;s tasks and can&apos;t be edited directly.
          </Text>
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={pending}>
            Save changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
