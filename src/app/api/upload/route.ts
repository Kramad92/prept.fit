import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { uploadFile, generateKey, getFileUrl } from "@/lib/s3";
import { logStorageUsage } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit uploads per tenant
    const rl = await rateLimit("upload", session.user.tenantId);
    if (rl) return rl;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const key = generateKey(session.user.tenantId, folder, file.name);

    await uploadFile(key, buffer, file.type);

    logStorageUsage({ tenantId: session.user.tenantId, fileKey: key, sizeBytes: buffer.length, folder });

    const url = await getFileUrl(key);

    return NextResponse.json({ key, url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
