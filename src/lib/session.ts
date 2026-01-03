import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireCoach() {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireClient() {
  const session = await getSession();
  if (!session || session.user.role !== "CLIENT" || !session.user.clientProfileId) {
    throw new Error("Unauthorized");
  }
  return session;
}
