import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { uploadFile, generateKey, getFileUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const key = generateKey(session.user.tenantId, folder, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadFile(key, buffer, file.type);

    const url = getFileUrl(key);

    return NextResponse.json({ key, url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
