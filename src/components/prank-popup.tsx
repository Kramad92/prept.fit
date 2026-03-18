"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

interface PrankConfig {
  imageUrls: string[];
  message?: string | null;
}

function pickRandom(urls: string[]): string {
  return urls[Math.floor(Math.random() * urls.length)];
}

export function PrankPopup() {
  const pathname = usePathname();
  const [prank, setPrank] = useState<PrankConfig | null>(null);
  const [currentImage, setCurrentImage] = useState("");
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const initialShown = useRef(false);

  // Fetch prank config once on mount
  useEffect(() => {
    fetch("/api/portal/prank-popup")
      .then((r) => r.json())
      .then((data) => {
        if (data.prank?.imageUrls?.length) {
          setPrank(data.prank);
          setLoaded(true);
          // Show on first load (login)
          setCurrentImage(pickRandom(data.prank.imageUrls));
          setVisible(true);
          initialShown.current = true;
        }
      })
      .catch(() => {});
  }, []);

  // Show a random image on every route change
  useEffect(() => {
    if (loaded && prank && initialShown.current) {
      setCurrentImage(pickRandom(prank.imageUrls));
      setVisible(true);
    }
  }, [pathname, loaded, prank]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!prank || !visible || !currentImage) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="relative mx-4 flex max-w-sm flex-col items-center rounded-2xl bg-white p-6 shadow-2xl"
        style={{
          animation: "prank-bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt="Surprise!"
          className="h-auto max-h-80 w-full rounded-xl object-cover"
        />
        {prank.message && (
          <p className="mt-4 text-center text-lg font-bold text-gray-900">
            {prank.message}
          </p>
        )}
        <button
          onClick={dismiss}
          className="mt-4 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95"
        >
          OK OK I see it
        </button>
      </div>

      {/* Global keyframes for the bounce animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes prank-bounce-in {
          0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
          50% { opacity: 1; transform: scale(1.08) rotate(2deg); }
          70% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}} />
    </div>
  );
}
