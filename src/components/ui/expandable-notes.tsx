"use client";

import { useState } from "react";

export function ExpandableNotes({
  notes,
  className = "mt-1 text-sm italic text-gray-400",
}: {
  notes: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <p
      onClick={() => setExpanded((v) => !v)}
      className={`${className} cursor-pointer ${expanded ? "" : "line-clamp-3"}`}
    >
      {notes}
    </p>
  );
}
