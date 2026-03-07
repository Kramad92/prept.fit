"use client";

import { useState, useRef, useEffect } from "react";

export function ExpandableNotes({
  notes,
  className = "mt-1 text-sm italic text-gray-400",
}: {
  notes: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight);
    }
  }, [notes]);

  return (
    <div>
      <p
        ref={ref}
        className={`${className} ${expanded ? "" : "line-clamp-2"}`}
      >
        {notes}
      </p>
      {clamped && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-0.5 text-xs text-brand-600 hover:text-brand-700"
        >
          Show more
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-0.5 text-xs text-brand-600 hover:text-brand-700"
        >
          Show less
        </button>
      )}
    </div>
  );
}
