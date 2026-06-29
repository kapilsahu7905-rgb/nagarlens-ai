const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export interface ParsedImage {
  mimeType: string;
  base64: string;
}

export function parseImageDataUrl(value: string): ParsedImage {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
  if (!match) {
    throw new Error("Image must be a valid JPEG, PNG or WebP data URL.");
  }

  const mimeType = match[1];
  const base64 = match[2].replace(/\s/g, "");
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type.");
  }

  const bytes = Buffer.byteLength(base64, "base64");
  if (bytes <= 0 || bytes > MAX_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 6 MB after compression.");
  }

  return { mimeType, base64 };
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected server error.";
}
