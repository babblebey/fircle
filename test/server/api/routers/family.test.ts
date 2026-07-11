import { beforeEach, describe, expect, it, vi } from "vitest"

const mockedEnv = vi.hoisted(() => ({
  DATABASE_URL: "postgresql://user:pass@localhost:5432/fircle_test",
  SELF_HOSTED: true,
  STORAGE_DRIVER: "r2",
  NODE_ENV: "test",
  EMAIL_FROM_ADDRESS: "no-reply@example.com",
  EMAIL_FROM_NAME: "Fircle",
}))

vi.mock("~/env", () => ({
  env: mockedEnv,
}))

vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("~/server/db", () => ({
  db: {},
}))

import { familyRouter } from "~/server/api/routers/family"

function createCaller(db: unknown, userId = "user-1") {
  return familyRouter.createCaller({
    db,
    session: {
      user: { id: userId },
    },
    headers: new Headers(),
  } as never)
}

describe("familyRouter identity and management context brandingConfig", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  const familyId = "clh0000000000000000000601"
  const memberId = "clh0000000000000000000602"

  it("stores normalized brandingConfig for owners and admins", async () => {
    const update = vi.fn(async () => ({
      id: familyId,
      name: "Ng",
      description: "Private family space",
      image: null,
      brandingConfig: {
        version: 1,
        logotype: {
          enabled: true,
          fontName: "Manufacturing Consent",
          fontProvider: "api.fonts.coollabs.io",
        },
      },
    }))

    const db = {
      familyMember: {
        findUnique: vi.fn().mockResolvedValue({
          id: memberId,
          familyId,
          role: "OWNER",
        }),
      },
      family: {
        update,
      },
    } as never

    const caller = createCaller(db)

    const updateCall = caller.updateFamilyIdentity({
      familyId,
      name: "Ng",
      description: "Private family space",
      image: null,
      brandingConfig: {
        version: 1,
        logotype: {
          enabled: true,
          fontName: "  Manufacturing   Consent  ",
          fontProvider: "api.fonts.coollabs.io",
        },
      },
    })

    await expect(updateCall).resolves.toMatchObject({
      brandingConfig: {
        version: 1,
        logotype: {
          enabled: true,
          fontName: "Manufacturing Consent",
          fontProvider: "api.fonts.coollabs.io",
        },
      },
    })

    const firstUpdateCallArgs = update.mock.calls[0] as [{ data?: { brandingConfig?: unknown } }] | undefined
    const firstUpdateCall = firstUpdateCallArgs?.[0]

    expect(firstUpdateCall?.data?.brandingConfig).toEqual({
      version: 1,
      logotype: {
        enabled: true,
        fontName: "Manufacturing Consent",
        fontProvider: "api.fonts.coollabs.io",
      },
    })
  })

  it("throws FORBIDDEN for non-admin members", async () => {
    const db = {
      familyMember: {
        findUnique: vi.fn().mockResolvedValue({
          id: memberId,
          familyId,
          role: "MEMBER",
        }),
      },
      family: {
        update: vi.fn(),
      },
    } as never

    const caller = createCaller(db)

    await expect(
      caller.updateFamilyIdentity({
        familyId,
        name: "Ng",
        description: null,
        image: null,
        brandingConfig: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    expect((db as { family: { update: ReturnType<typeof vi.fn> } }).family.update).not.toHaveBeenCalled()
  })

  it("throws FORBIDDEN when caller is not scoped to target family", async () => {
    const db = {
      familyMember: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      family: {
        update: vi.fn(),
      },
    } as never

    const caller = createCaller(db)

    await expect(
      caller.updateFamilyIdentity({
        familyId,
        name: "Ng",
        description: null,
        image: null,
        brandingConfig: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    expect((db as { family: { update: ReturnType<typeof vi.fn> } }).family.update).not.toHaveBeenCalled()
  })

  it("rejects non-allowlisted branding font names before save", async () => {
    const db = {
      familyMember: {
        findUnique: vi.fn(),
      },
      family: {
        update: vi.fn(),
      },
    } as never

    const caller = createCaller(db)

    await expect(
      caller.updateFamilyIdentity({
        familyId,
        name: "Ng",
        description: null,
        image: null,
        brandingConfig: {
          version: 1,
          logotype: {
            enabled: true,
            fontName: "Not A Real Font",
            fontProvider: "api.fonts.coollabs.io",
          },
        },
      }),
    ).rejects.toThrow(/fontName/i)

    expect((db as { family: { update: ReturnType<typeof vi.fn> } }).family.update).not.toHaveBeenCalled()
  })

  it("returns normalized brandingConfig in management context", async () => {
    const db = {
      familyMember: {
        findMany: vi.fn().mockResolvedValue([
          {
            familyId,
            role: "ADMIN",
            createdAt: new Date("2030-01-01T00:00:00.000Z"),
          },
        ]),
      },
      family: {
        findUnique: vi.fn().mockResolvedValue({
          id: familyId,
          name: "Ng",
          description: "Private family space",
          image: null,
          brandingConfig: {
            version: 1,
            logotype: {
              enabled: true,
              fontName: "  Manufacturing   Consent  ",
              fontProvider: "api.fonts.coollabs.io",
            },
          },
        }),
      },
    } as never

    const caller = createCaller(db)
    const result = await caller.getManagementContext()

    expect(result.family).toMatchObject({
      id: familyId,
      name: "Ng",
      brandingConfig: {
        version: 1,
        logotype: {
          enabled: true,
          fontName: "Manufacturing Consent",
          fontProvider: "api.fonts.coollabs.io",
        },
      },
    })
  })
})
