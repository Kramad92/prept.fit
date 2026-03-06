"use client";

import { useEffect } from "react";

export function MobileInputScroll() {
  useEffect(() => {
    let spacer: HTMLDivElement | null = null;
    let scrollContainer: Element | null = null;

    function handleFocus(e: FocusEvent) {
      const el = e.target;
      if (
        !(el instanceof HTMLInputElement) &&
        !(el instanceof HTMLTextAreaElement) &&
        !(el instanceof HTMLSelectElement)
      )
        return;

      if (window.innerWidth >= 768) return;

      // Find the nearest scrollable ancestor (modal form, page, etc.)
      const scroller = findScrollParent(el);

      // Add bottom spacer so inputs near the bottom can scroll to top
      if (scroller && scroller !== document.documentElement) {
        removeSpacer();
        spacer = document.createElement("div");
        spacer.style.height = "60vh";
        spacer.style.flexShrink = "0";
        scroller.appendChild(spacer);
        scrollContainer = scroller;
      }

      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }

    function handleBlur() {
      // Small delay to avoid removing spacer when tabbing between fields
      setTimeout(removeSpacer, 400);
    }

    function removeSpacer() {
      if (spacer && spacer.parentNode) {
        // Only remove if no input is currently focused in the same container
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement
        ) {
          const activeScroller = findScrollParent(active);
          if (activeScroller === scrollContainer) return;
        }
        spacer.parentNode.removeChild(spacer);
        spacer = null;
        scrollContainer = null;
      }
    }

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
      removeSpacer();
    };
  }, []);

  return null;
}

function findScrollParent(el: HTMLElement): Element | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return document.documentElement;
}
