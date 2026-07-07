"use client";

import { useEffect, useState } from "react";
import { ChevronIcon, PlusIcon } from "./icons";
import { NewBoardModal } from "./NewBoardModal";
import type { BoardDTO } from "@/lib/types";

interface BoardSwitcherProps {
  boards: BoardDTO[];
  currentBoardId: string;
  onSwitchBoard: (boardId: string) => void;
}

export function BoardSwitcher({ boards, currentBoardId, onSwitchBoard }: BoardSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const currentBoard = boards.find((b) => b.id === currentBoardId);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".board-switcher-trigger") && !target.closest(".board-switcher-popover")) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        className="board-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "3px 4px",
          borderRadius: 6,
          font: "inherit",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>/ {currentBoard?.name ?? "Select board"}</span>
        <ChevronIcon size={12} className="board-switcher-chev" style={{ transform: "rotate(90deg)" }} />
      </button>
      {open && (
        <div className="popover board-switcher-popover" style={{ left: 0, width: 220 }}>
          <div className="popover-section-label">Boards</div>
          {boards.map((b) => (
            <div
              key={b.id}
              className={`popover-row ${b.id === currentBoardId ? "on" : ""}`}
              onClick={() => {
                setOpen(false);
                onSwitchBoard(b.id);
              }}
            >
              {b.name}
            </div>
          ))}
          <div className="popover-footer" style={{ padding: 6 }}>
            <div
              className="popover-row"
              style={{ width: "100%", justifyContent: "flex-start", gap: 6 }}
              onClick={() => {
                setOpen(false);
                setNewBoardOpen(true);
              }}
            >
              <PlusIcon size={13} />
              New board
            </div>
          </div>
        </div>
      )}
      <NewBoardModal
        opened={newBoardOpen}
        onClose={() => setNewBoardOpen(false)}
        onCreated={(boardId) => onSwitchBoard(boardId)}
      />
    </div>
  );
}
