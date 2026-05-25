/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("~/server/db", () => ({
  db: {},
}));

vi.mock("~/server/storage", () => ({
  getStorageProvider: () => ({
    driver: "r2",
    buildReadUrl: ({ bucket, objectKey }: { bucket: string; objectKey: string }) =>
      `/api/media/r2/${bucket}/${objectKey}`,
  }),
}));

import { mediaRouter } from "~/server/api/routers/media";

function createCaller(db: unknown, userId = "user-1") {
  return mediaRouter.createCaller({
    db,
    session: {
      user: { id: userId },
    },
    headers: new Headers(),
  } as never);
}

function makeMediaRow(
  id: string,
  createdAtIso: string,
  authorMemberId: string,
  authorName: string,
  options?: {
    mediaTags?: Array<{
      id: string;
      taggedMemberId: string;
      taggedMemberName: string;
      xPercent?: number | null;
      yPercent?: number | null;
    }>;
    familyImage?: string | null;
    durationMs?: number | null;
  },
) {
  const createdAt = new Date(createdAtIso);

  return {
    id,
    type: options?.durationMs ? ("VIDEO" as const) : ("IMAGE" as const),
    provider: "r2",
    bucket: "fircle",
    objectKey: `families/fam-1/posts/${id}`,
    url: `https://cdn.example.com/${id}`,
    mimeType: options?.durationMs ? "video/mp4" : "image/jpeg",
    sizeBytes: 1024,
    width: options?.durationMs ? null : 1200,
    height: options?.durationMs ? null : 800,
    durationMs: options?.durationMs ?? null,
    caption: `${id}-caption`,
    sortOrder: 0,
    createdAt,
    post: {
      id: `post-${id}`,
      createdAt,
      authorMemberId,
      authorMember: {
        id: authorMemberId,
        name: authorName,
        slug: `${authorName.toLowerCase().replace(/\s+/g, "-")}`,
        image: options?.familyImage ?? null,
      },
    },
    mediaTags:
      options?.mediaTags?.map((tag) => ({
        id: tag.id,
        postMediaId: id,
        taggedMemberId: tag.taggedMemberId,
        xPercent: tag.xPercent ?? null,
        yPercent: tag.yPercent ?? null,
        createdAt,
        updatedAt: createdAt,
        taggedMember: {
          id: tag.taggedMemberId,
          name: tag.taggedMemberName,
          slug: tag.taggedMemberName.toLowerCase().replace(/\s+/g, "-"),
          image: null,
          userId: null,
        },
      })) ?? [],
  };
}

describe("mediaRouter.getFamilyGallery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const familyId = "clh0000000000000000000002";

  it("returns family-scoped rows in media-level cursor order", async () => {
    const findMany = vi.fn().mockResolvedValue([
      makeMediaRow("media-c", "2030-01-03T00:00:00.000Z", "member-a", "Parent One"),
      makeMediaRow("media-b", "2030-01-02T00:00:00.000Z", "member-a", "Parent One"),
      makeMediaRow("media-a", "2030-01-01T00:00:00.000Z", "member-a", "Parent One"),
    ]);

    const db = {
      familyMember: {
        findUnique: vi.fn().mockResolvedValue({ id: "member-viewer", familyId }),
      },
      postMedia: {
        findMany,
      },
    } as never;

    const caller = createCaller(db);

    const result = await caller.getFamilyGallery({
      familyId,
      limit: 2,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        where: expect.objectContaining({
          post: {
            authorMember: {
              familyId,
            },
          },
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );

    expect(result.items.map((item) => item.id)).toEqual(["media-c", "media-b"]);
    expect(result.items[0]?.url).toBe("/api/media/r2/fircle/families/fam-1/posts/media-c");
    expect(result.nextCursor).toBe("2030-01-02T00:00:00.000Z__media-b");
  });

  it("applies cursor filters for subsequent pages", async () => {
    const findMany = vi.fn().mockResolvedValue([
      makeMediaRow("media-a", "2030-01-01T00:00:00.000Z", "member-a", "Parent One"),
    ]);

    const db = {
      familyMember: {
        findUnique: vi.fn().mockResolvedValue({ id: "member-viewer", familyId }),
      },
      postMedia: {
        findMany,
      },
    } as never;

    const caller = createCaller(db);

    await caller.getFamilyGallery({
      familyId,
      limit: 2,
      cursor: "2030-01-02T00:00:00.000Z__media-b",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { createdAt: { lt: new Date("2030-01-02T00:00:00.000Z") } },
            { createdAt: new Date("2030-01-02T00:00:00.000Z"), id: { lt: "media-b" } },
          ],
        }),
      }),
    );
  });
});

describe("mediaRouter.getMemberGallery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const familyId = "clh0000000000000000000002";
  const memberId = "clh0000000000000000000044";

  it("returns published and deduped tagged rows in deterministic order", async () => {
    const published = [
      makeMediaRow("media-2", "2030-01-03T00:00:00.000Z", memberId, "Member Target"),
      makeMediaRow("media-1", "2030-01-01T00:00:00.000Z", memberId, "Member Target"),
    ];
    const tagged = [
      makeMediaRow("media-3", "2030-01-04T00:00:00.000Z", "member-other", "Parent Two", {
        mediaTags: [
          {
            id: "tag-1",
            taggedMemberId: memberId,
            taggedMemberName: "Member Target",
          },
        ],
      }),
      makeMediaRow("media-1", "2030-01-01T00:00:00.000Z", memberId, "Member Target", {
        mediaTags: [
          {
            id: "tag-2",
            taggedMemberId: memberId,
            taggedMemberName: "Member Target",
          },
        ],
      }),
    ];

    const findMany = vi
      .fn()
      .mockResolvedValueOnce(published)
      .mockResolvedValueOnce(tagged);

    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: "viewer-member", familyId })
      .mockResolvedValueOnce({ id: memberId });

    const db = {
      familyMember: {
        findUnique: vi.fn().mockResolvedValue({ id: "viewer-member", familyId }),
        findFirst,
      },
      postMedia: {
        findMany,
      },
    } as never;

    const caller = createCaller(db);

    const result = await caller.getMemberGallery({
      familyId,
      memberId,
      limit: 20,
    });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          post: {
            authorMemberId: memberId,
            authorMember: {
              familyId,
            },
          },
        },
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          post: {
            authorMember: {
              familyId,
            },
          },
          mediaTags: {
            some: {
              taggedMemberId: memberId,
            },
          },
        },
      }),
    );

    expect(result.publishedMedia.map((item) => item.id)).toEqual(["media-2", "media-1"]);
    expect(result.taggedMedia.map((item) => item.id)).toEqual(["media-3"]);
  });

  it("enforces family membership for member gallery requests", async () => {
    const db = {
      familyMember: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn(),
      },
      postMedia: {
        findMany: vi.fn(),
      },
    } as never;

    const caller = createCaller(db);

    await expect(
      caller.getMemberGallery({
        familyId,
        memberId,
        limit: 20,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
