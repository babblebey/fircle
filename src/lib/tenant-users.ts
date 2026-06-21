import type { PrismaClient } from "../../generated/prisma";

import { normalizeEmail } from "~/lib/email";

type TenantUser = {
  id: string;
  email: string | null;
  password: string | null;
  familyId: string | null;
};

type UserAccessor = Pick<PrismaClient, "user">;

type UserQueryAccessor = {
  findFirst?: (...args: unknown[]) => Promise<TenantUser | null>;
  findUnique?: (...args: unknown[]) => Promise<TenantUser | null>;
};

export function normalizeTenantEmail(email: string): string {
  return normalizeEmail(email);
}

export async function findTenantUserByEmail(
  db: UserAccessor,
  familyId: string,
  email: string,
) {
  const normalizedEmail = normalizeTenantEmail(email);
  const userQueries = db.user as UserQueryAccessor;

  if (typeof userQueries.findFirst === "function") {
    return userQueries.findFirst({
      where: {
        familyId,
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
        password: true,
        familyId: true,
      },
    });
  }

  if (typeof userQueries.findUnique === "function") {
    return userQueries.findUnique({
      where: { email: normalizedEmail },
    });
  }

  return null;
}