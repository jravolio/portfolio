"use client";

import { useRef } from "react";

function showReading(dialogId: string) {
  (document.getElementById(dialogId) as HTMLDialogElement | null)?.showModal();
}

export function OpenReading({
  dialogId,
  className,
  describedBy,
  children,
}: {
  dialogId: string;
  className: string;
  describedBy: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      aria-describedby={describedBy}
      onClick={() => showReading(dialogId)}
    >
      {children}
    </button>
  );
}

export function OpenReadingFromCard({
  dialogId,
  className,
  children,
}: {
  dialogId: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={className} aria-hidden="true" tabIndex={-1} onClick={() => showReading(dialogId)}>
      {children}
    </button>
  );
}

export function ReadingDialog({
  id,
  labelledBy,
  children,
}: {
  id: string;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const pressedOnBackdrop = useRef(false);

  return (
    <dialog
      id={id}
      className="reading"
      aria-labelledby={labelledBy}
      onPointerDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {children}
    </dialog>
  );
}
