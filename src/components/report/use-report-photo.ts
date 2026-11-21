"use client";

import { useRef, useState } from "react";

import { compressImageFile } from "@/lib/photo-compress";

const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const COMPRESSING = "Compressing photo…";

export function useReportPhoto(onSelection?: () => void) {
  const [photo, setPhoto] = useState("");
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  async function onPhoto(file: File | undefined): Promise<void> {
    const current = generation.current + 1;
    generation.current = current;
    onSelection?.();
    setError(null);
    setPhoto("");
    setPreview("");
    if (!file) {
      if (current === generation.current) setStatus("");
      return;
    }
    if (!PHOTO_TYPES.has(file.type)) {
      if (current === generation.current) {
        setStatus("");
        setError("Use a JPEG, PNG, or WebP photo.");
      }
      return;
    }
    setStatus(COMPRESSING);
    try {
      const dataUrl = await compressImageFile(file);
      if (current !== generation.current) return;
      setPhoto(dataUrl);
      setPreview(dataUrl);
      setStatus("Photo ready.");
    } catch (caught) {
      if (current !== generation.current) return;
      setStatus("");
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not prepare the photo.",
      );
    }
  }

  return {
    photo,
    preview,
    status,
    error,
    busy: status === COMPRESSING,
    setError,
    onPhoto,
  };
}
