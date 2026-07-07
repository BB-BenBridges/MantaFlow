"use client";

import { useState, useTransition } from "react";
import { Modal, TextInput, Button, Stack, Group } from "@mantine/core";
import { useRouter } from "next/navigation";
import { createBoard } from "@/server/actions";

interface NewBoardModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}

export function NewBoardModal({ opened, onClose, onCreated }: NewBoardModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setError(null);
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Board name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const board = await createBoard(name);
      reset();
      onClose();
      router.refresh();
      onCreated(board.id);
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New board"
    >
      <Stack gap="sm">
        <TextInput
          label="Board name"
          placeholder="Marketing"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={error && !name.trim() ? error : undefined}
          data-autofocus
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={pending}>
            Create board
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
