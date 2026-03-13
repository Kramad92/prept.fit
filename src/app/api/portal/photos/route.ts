import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, photoCreateSchema, photoUpdateSchema } from "@/lib/validations";
// Client uploads their own progress photo
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, photoCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { key, caption, category } = parsed.data;

  const photo = await prisma.progressPhoto.create({
    data: {
      url: key,
      caption: caption || null,
      category: category || null,
      clientId: session.user.clientProfileId,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}

// Client edits their own photo
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, photoUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { photoId, caption, category } = parsed.data;

  const photo = await prisma.progressPhoto.updateMany({
    where: { id: photoId, clientId: session.user.clientProfileId },
    data: {
      caption: caption ?? undefined,
      category: category ?? undefined,
    },
  });

  if (photo.count === 0) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// Client deletes their own photo
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");

  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  await prisma.progressPhoto.deleteMany({
    where: { id: photoId, clientId: session.user.clientProfileId },
  });

  return NextResponse.json({ success: true });
}
