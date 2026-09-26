import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { API_KEY_PREFIX } from "@/lib/telex/api-request";

// Keys of the receiving API (CLAUDE.md, 7. mérföldkő, "API-kulcsok"): the
// admin makes them, the key is shown once, only its hash is stored, and it
// can be revoked. Every call is logged.

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** Makes a key; the returned text is the only time it is seen. */
export async function createApiKey(name: string, userId: string): Promise<string> {
  const key = `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  await prisma.apiKey.create({
    data: { name, keyHash: hashKey(key), prefix: key.slice(0, API_KEY_PREFIX.length + 4), createdById: userId },
  });
  return key;
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const updated = await prisma.apiKey.updateMany({
    where: { id, active: true },
    data: { active: false, revokedAt: new Date() },
  });
  return updated.count > 0;
}

/** The active key of a request, or null. */
export async function findActiveKey(key: string) {
  const found = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(key) }, select: { id: true, name: true, active: true } });
  return found?.active ? found : null;
}

export async function logApiCall(apiKeyId: string | null, status: number, result: string) {
  await prisma.apiCallLog.create({ data: { apiKeyId, status, result } });
  if (apiKeyId) await prisma.apiKey.update({ where: { id: apiKeyId }, data: { lastUsedAt: new Date() } });
}

export async function listApiKeys() {
  return prisma.apiKey.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
}

export async function listApiCalls(limit = 50) {
  return prisma.apiCallLog.findMany({
    include: { apiKey: { select: { name: true } } },
    orderBy: { at: "desc" },
    take: limit,
  });
}
