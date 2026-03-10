"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface BaseProps {
  options: Option[];
  placeholder: string;
  className?: string;
  name?: string;
}

interface SingleProps extends BaseProps {
  multi?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  multi: true;
  value: string[];
  onChange: (value: string[]) => void;
}

type FilterSelectProps = SingleProps | MultiProps;

export function FilterSelect(props: FilterSelectProps) {
  const { options, placeholder, className = "", name, multi } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Normalize to array for internal logic
  const selected: string[] = multi ? props.value : props.value ? [props.value] : [];

  function handleSelect(v: string) {
    if (multi) {
      const cur = props.value as string[];
      if (cur.includes(v)) {
        (props.onChange as (v: string[]) => void)(cur.filter((x) => x !== v));
      } else {
        (props.onChange as (v: string[]) => void)([...cur, v]);
      }
    } else {
      (props.onChange as (v: string) => void)(v);
      setOpen(false);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    if (multi) {
      (props.onChange as (v: string[]) => void)([]);
    } else {
      (props.onChange as (v: string) => void)("");
      setOpen(false);
    }
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label || selected[0]
        : `${selected.length} selected`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={multi ? selected.join(",") : selected[0] || ""} />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${selected.length > 0 ? "text-gray-900" : "text-gray-400"}`}>
          {label}
        </span>
        <div className="flex flex-shrink-0 items-center gap-1">
          {selected.length > 0 && (
            <span
              role="button"
              onClick={handleClear}
              className="rounded-full p-0.5 hover:bg-gray-200"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${isSelected ? "bg-brand-50 text-brand-700" : "text-gray-700"}`}
              >
                {multi ? (
                  <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${isSelected ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300"}`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                ) : (
                  isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />
                )}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
