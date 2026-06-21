import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("~/server/notifications", () => ({
  createNotifications: vi.fn().mockResolvedValue([]),
  dispatchPushForNotifications: vi.fn().mockResolvedValue(undefined),
  getClaimedAdminMemberIds: vi.fn().mockResolvedValue([]),
  getClaimedMemberIds: vi.fn().mockResolvedValue([]),
}));

import { inviteRouter } from "~/server/api/routers/invite";
import { familyMemberRouter } from "~/server/api/routers/family-member";

describe("tenant-scoped email behavior", () => {
  it("acceptInvite allows the same email when it exists in another family", async () => {
    const familyA = "clh0000000000000000001001";
    const familyB = "clh0000000000000000001002";

    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({ id: "user-new", email: "shared@example.com" }),
      },
      invite: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      familyMember: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "member-new" }),
      },
    };

    const userFindFirst = vi.fn((args: { where: { familyId: string; email: string } }) => {
      if (args.where.familyId === familyA) {
        return Promise.resolve(null);
      }
      if (args.where.familyId === familyB) {
        return Promise.resolve({
          id: "user-in-family-b",
          familyId: familyB,
          email: "shared@example.com",
          password: "hashed",
        });
      }
      return Promise.resolve(null);
    });

    const db = {
      invite: {
        findUnique: vi.fn().mockResolvedValue({
          id: "invite-1",
          code: "INVITE_CODE_123456",
          type: "OPEN",
          status: "PENDING",
          familyId: familyA,
          invitedEmail: null,
          createdById: "creator-1",
          expiresAt: new Date("2031-01-01T00:00:00.000Z"),
          claimedAt: null,
          claimedById: null,
          claimMemberId: null,
          revokedAt: null,
        }),
      },
      user: {
        findFirst: userFindFirst,
      },
      $transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    await expect(
      inviteRouter.createCaller({
        db,
        session: null,
        headers: new Headers(),
      } as unknown as Parameters<typeof inviteRouter.createCaller>[0]).acceptInvite({
        code: "INVITE_CODE_123456",
        email: "shared@example.com",
        password: "password123",
        name: "Shared User",
      }),
    ).resolves.toMatchObject({
      userId: "user-new",
      email: "shared@example.com",
    });
    expect(userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          familyId: familyA,
          email: "shared@example.com",
        },
      }),
    );
    expect(tx.user.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        familyId: familyA,
        email: "shared@example.com",
      },
    });
  });

  it("claimMemberProfile allows the same email when it exists in another family", async () => {
    const familyA = "clh0000000000000000002001";
    const familyB = "clh0000000000000000002002";
    const claimMemberId = "clh0000000000000000002003";

    const tx = {
      user: {
        create: vi.fn().mockResolvedValue({ id: "claimed-user-1" }),
      },
      invite: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      familyMember: {
        update: vi.fn().mockResolvedValue({ id: claimMemberId, userId: "claimed-user-1" }),
      },
    };

    const userFindFirst = vi.fn((args: { where: { familyId: string; email: string } }) => {
      if (args.where.familyId === familyA) {
        return Promise.resolve(null);
      }
      if (args.where.familyId === familyB) {
        return Promise.resolve({
          id: "user-in-family-b",
          familyId: familyB,
          email: "shared@example.com",
          password: "hashed",
        });
      }
      return Promise.resolve(null);
    });

    const db = {
      invite: {
        findUnique: vi.fn().mockResolvedValue({
          id: "claim-invite-1",
          code: "CLAIM_TOKEN_123456",
          type: "EMAIL_BOUND",
          status: "PENDING",
          familyId: familyA,
          invitedEmail: "shared@example.com",
          createdById: "creator-1",
          expiresAt: new Date("2031-01-01T00:00:00.000Z"),
          claimedAt: null,
          claimedById: null,
          claimMemberId,
          revokedAt: null,
          claimMember: {
            id: claimMemberId,
            familyId: familyA,
            userId: null,
            name: "Grandma Mary",
          },
        }),
      },
      user: {
        findFirst: userFindFirst,
      },
      $transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    await expect(
      familyMemberRouter.createCaller({
        db,
        session: null,
        headers: new Headers(),
      } as unknown as Parameters<typeof familyMemberRouter.createCaller>[0]).claimMemberProfile({
        code: "CLAIM_TOKEN_123456",
        email: "shared@example.com",
        password: "password123",
        confirmPassword: "password123",
      }),
    ).resolves.toMatchObject({
      userId: "claimed-user-1",
      memberId: claimMemberId,
      familyId: familyA,
    });
    expect(userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          familyId: familyA,
          email: "shared@example.com",
        },
      }),
    );
    expect(tx.user.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        familyId: familyA,
        email: "shared@example.com",
      },
    });
  });
});
