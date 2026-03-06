import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getFileUrl } from "@/lib/s3";

// Client uploads their own progress photo
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, caption, category } = await req.json();

  if (!key) {
    return NextResponse.json({ error: "File key is required" }, { status: 400 });
  }

  const url = getFileUrl(key);

  const photo = await prisma.progressPhoto.create({
    data: {
      url,
      caption: caption || null,
      category: category || null,
      clientId: session.user.clientProfileId,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
