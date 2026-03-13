import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBody, inquiryCreateSchema } from "@/lib/validations";
import { sendInquiryNotification } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Rate limit public form submissions by IP
  const rl = await rateLimit("public", getClientIp(req));
  if (rl) return rl;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: { id: true, landingPageEnabled: true, email: true, name: true },
  });

  if (!tenant || !tenant.landingPageEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await validateBody(req, inquiryCreateSchema);
  if ("error" in parsed) return parsed.error;

  // Honeypot check — if filled, silently succeed
  if (parsed.data._hp) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
      preferredSlot: parsed.data.preferredSlot || null,
      tenantId: tenant.id,
    },
  });

  // Send email notification to coach (non-blocking)
  if (tenant.email) {
    sendInquiryNotification({
      to: tenant.email,
      businessName: tenant.name,
      inquiryName: parsed.data.name,
      inquiryEmail: parsed.data.email,
      inquiryMessage: parsed.data.message,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
}
