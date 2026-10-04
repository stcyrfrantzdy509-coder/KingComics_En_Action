/*
 * KCA Module 30 — media validation helpers.
 * Blueprint only. This does not upload, scan, transcode, or store files.
 */

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

export const MEDIA_LIMITS = Object.freeze({
  imageBytes: 10 * 1024 * 1024,     // 10 MiB
  videoBytes: 250 * 1024 * 1024,   // 250 MiB initial MVP limit
  videoSeconds: 180,               // 3 minutes
});

export function validateDeclaredMedia({ mimeType, sizeBytes, mediaKind }) {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, reason: "Taille de fichier invalide." };
  }
  if (mediaKind === "image") {
    if (!IMAGE_MIME.has(mimeType)) return { ok: false, reason: "Format d’image non pris en charge." };
    if (sizeBytes > MEDIA_LIMITS.imageBytes) return { ok: false, reason: "Image trop volumineuse." };
    return { ok: true };
  }
  if (mediaKind === "video") {
    if (!VIDEO_MIME.has(mimeType)) return { ok: false, reason: "Format vidéo non pris en charge." };
    if (sizeBytes > MEDIA_LIMITS.videoBytes) return { ok: false, reason: "Vidéo trop volumineuse." };
    return { ok: true };
  }
  return { ok: false, reason: "Type de média invalide." };
}

/**
 * Required upload flow:
 * 1. Authenticate owner and reserve a random storage key server-side.
 * 2. Upload to private quarantine storage, never directly to a public web folder.
 * 3. Check actual bytes/signature, not just declared MIME type or extension.
 * 4. Scan for malware and parse metadata in an isolated worker.
 * 5. For video, transcode to safe supported formats and enforce duration limits.
 * 6. Set status='ready' only after all checks succeed.
 * 7. Serve through authorized signed URLs or a controlled media endpoint.
 */
export function mediaStatusCanBeUsed(status) {
  return status === "ready";
}
