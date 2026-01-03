import { headers } from "next/headers";
import { prisma } from "./prisma";

export async function getTenantFromHost() {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // Extract subdomain: coach-name.trainerhub.com → coach-name
  // In development: use query param or default tenant
  const parts = host.split(".");

  let slug: string;
  if (parts.length >= 3) {
    slug = parts[0];
  } else {
    // Development fallback — use first tenant
    slug = "demo";
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  return tenant;
}
