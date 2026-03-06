"use client";

import { useEffect } from "react";

export function MobileInputScroll() {
  useEffect(() => {
    function handleFocus(e: FocusEvent) {
      const el = e.target;
      if (
        !(el instanceof HTMLInputElement) &&
        !(el instanceof HTMLTextAreaElement) &&
        !(el instanceof HTMLSelectElement)
      )
        return;

      // Only on mobile (rough check)
      if (window.innerWidth >= 768) return;

      // Wait for keyboard to finish opening
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  return null;
}
