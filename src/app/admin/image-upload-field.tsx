"use client";

import Image from "next/image";
import { useId, useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";

const maxFileSize = 6 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type ImageUploadFieldProps = Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}>;

function canPreview(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "images.unsplash.com" || url.hostname.endsWith(".supabase.co"))
    );
  } catch {
    return false;
  }
}

export function ImageUploadField({ label, value, onChange, onUploadingChange }: ImageUploadFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setError("");
    if (!acceptedTypes.has(file.type)) {
      setError("Gunakan gambar JPG, PNG, WebP, atau AVIF.");
      return;
    }
    if (file.size <= 0 || file.size > maxFileSize) {
      setError("Ukuran gambar harus lebih dari 0 dan maksimal 6 MB.");
      return;
    }

    setUploading(true);
    onUploadingChange(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/assets", { method: "POST", body: formData });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Gambar gagal diunggah (${response.status}).`;
        throw new Error(message);
      }
      if (!payload || typeof payload !== "object" || !("url" in payload) || typeof payload.url !== "string") {
        throw new Error("URL gambar tidak diterima dari server.");
      }
      onChange(payload.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Gambar gagal diunggah.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <div className="form-full image-upload-field">
      <span className="image-upload-title">{label}</span>
      {canPreview(value) && (
        <span className="image-upload-preview">
          <Image src={value} alt={`Preview ${label.toLowerCase()}`} fill sizes="160px" />
        </span>
      )}
      <span className="image-upload-controls">
        <label className="image-upload-button">
          {uploading ? <LoaderCircle size={14} className="spin" /> : <ImagePlus size={14} />}
          {uploading ? "Mengunggah..." : "Pilih file gambar"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={uploading}
            onChange={(event) => void uploadImage(event)}
          />
        </label>
        {value && (
          <button
            className="image-upload-clear"
            type="button"
            disabled={uploading}
            onClick={() => {
              setError("");
              onChange("");
            }}
          >
            <X size={13} /> Hapus gambar
          </button>
        )}
      </span>
      <span className="image-upload-hint">JPG, PNG, WebP, atau AVIF; maksimal 6 MB.</span>
      <label className="image-upload-url-label" htmlFor={inputId}>Atau gunakan URL gambar HTTPS</label>
      <input
        id={inputId}
        type="url"
        value={value}
        disabled={uploading}
        onChange={(event) => {
          setError("");
          onChange(event.target.value);
        }}
        placeholder="https://..."
      />
      {error && <span className="image-upload-error" role="alert">{error}</span>}
    </div>
  );
}
