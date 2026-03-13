import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { key, caption, category } = await req.json();

  if (!key) {
    return NextResponse.json({ error: "File key is required" }, { status: 400 });
  }

  const photo = await prisma.progressPhoto.create({
    data: {
      url: key,
      caption: caption || null,
      category: category || null,
      clientId: client.id,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId, caption, category } = await req.json();

  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  const photo = await prisma.progressPhoto.updateMany({
    where: {
      id: photoId,
      client: { id: params.id, tenantId: session.user.tenantId },
    },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");

  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  await prisma.progressPhoto.deleteMany({
    where: {
      id: photoId,
      client: { id: params.id, tenantId: session.user.tenantId },
    },
  });

  return NextResponse.json({ success: true });
}
