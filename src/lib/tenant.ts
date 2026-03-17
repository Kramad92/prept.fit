import { headers } from "next/headers";
import { prisma } from "./prisma";

export async function getTenantFromHost() {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // Extract subdomain: coach-name.prept.fit → coach-name
  // In development: use query param or default tenant
  const parts = host.split(".");

  // Only resolve tenant from subdomain (e.g. coach-name.prept.fit)
  // On localhost / bare domains, return null so the main landing page shows
  if (parts.length < 3) {
    return null;
  }

  const slug = parts[0];

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  return tenant;
}
