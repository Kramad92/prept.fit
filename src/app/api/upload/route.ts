import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUploadUrl, generateKey } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, folder } = await req.json();

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  const key = generateKey(
    session.user.tenantId,
    folder || "uploads",
    filename
  );

  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
