"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Upload, X } from "lucide-react";

interface ImageUploaderProps {
  folder: string;
  onUploaded: (key: string) => void;
  onCancel?: () => void;
  className?: string;
}

function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUploader({ folder, onUploaded, onCancel, className }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setError("");
    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);
    setError("");

    try {
      const compressed = await compressImage(selectedFile);

      const formData = new FormData();
      formData.append("file", compressed, selectedFile.name.replace(/\.[^.]+$/, ".jpg"));
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { key } = await res.json();

      onUploaded(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleClear() {
    setPreview(null);
    setSelectedFile(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className={className}>
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="h-40 w-full rounded-lg object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {!uploading && (
            <button
              onClick={() => { handleClear(); onCancel?.(); }}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-8 text-gray-400 transition-colors hover:border-brand-400 hover:text-brand-500"
        >
          <Camera className="h-8 w-8" />
          <span className="mt-2 text-sm font-medium">Choose Photo</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {selectedFile && !uploading && (
        <button
          onClick={handleUpload}
          className="btn-primary mt-3 w-full text-sm"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Upload Photo
        </button>
      )}
    </div>
  );
}
