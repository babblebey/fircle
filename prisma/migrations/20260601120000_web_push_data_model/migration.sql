-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference_next" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "channel" "NotificationDeliveryChannel" NOT NULL DEFAULT 'IN_APP',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_next_pkey" PRIMARY KEY ("id")
);

WITH expanded AS (
    SELECT
        np."id" || ':' || event_types."eventType"::TEXT AS "id",
        np."familyId",
        np."memberId",
        CASE
            WHEN event_types."eventType" IN ('MEDIA_TAG_CREATED', 'MEDIA_TAG_UPDATED') THEN 'TAG'::"NotificationCategory"
            WHEN event_types."eventType" IN ('POST_MENTION_CREATED', 'COMMENT_MENTION_CREATED') THEN 'MENTION'::"NotificationCategory"
            WHEN event_types."eventType" IN ('POST_COMMENT_CREATED', 'COMMENT_REPLIED', 'POST_LIKED', 'COMMENT_LIKED') THEN 'ENGAGEMENT'::"NotificationCategory"
            WHEN event_types."eventType" IN ('INVITE_CREATED', 'INVITE_STATUS_CHANGED') THEN 'INVITE'::"NotificationCategory"
            ELSE 'SYSTEM'::"NotificationCategory"
        END AS "category",
        event_types."eventType",
        np."channel",
        np."isEnabled",
        np."createdAt",
        np."updatedAt"
    FROM "NotificationPreference" np
    CROSS JOIN LATERAL unnest(
        CASE
            WHEN np."category" = 'TAG' THEN ARRAY[
                'MEDIA_TAG_CREATED'::"NotificationEventType",
                'MEDIA_TAG_UPDATED'::"NotificationEventType"
            ]
            WHEN np."category" = 'MENTION' THEN ARRAY[
                'POST_MENTION_CREATED'::"NotificationEventType",
                'COMMENT_MENTION_CREATED'::"NotificationEventType"
            ]
            WHEN np."category" = 'ENGAGEMENT' THEN ARRAY[
                'POST_COMMENT_CREATED'::"NotificationEventType",
                'COMMENT_REPLIED'::"NotificationEventType",
                'POST_LIKED'::"NotificationEventType",
                'COMMENT_LIKED'::"NotificationEventType"
            ]
            WHEN np."category" = 'INVITE' THEN ARRAY[
                'INVITE_CREATED'::"NotificationEventType",
                'INVITE_STATUS_CHANGED'::"NotificationEventType"
            ]
            WHEN np."category" = 'SYSTEM' THEN ARRAY[
                'SYSTEM_EVENT'::"NotificationEventType"
            ]
            ELSE ARRAY[
                'MEDIA_TAG_CREATED'::"NotificationEventType",
                'MEDIA_TAG_UPDATED'::"NotificationEventType",
                'POST_MENTION_CREATED'::"NotificationEventType",
                'COMMENT_MENTION_CREATED'::"NotificationEventType",
                'POST_COMMENT_CREATED'::"NotificationEventType",
                'COMMENT_REPLIED'::"NotificationEventType",
                'POST_LIKED'::"NotificationEventType",
                'COMMENT_LIKED'::"NotificationEventType",
                'INVITE_CREATED'::"NotificationEventType",
                'INVITE_STATUS_CHANGED'::"NotificationEventType",
                'SYSTEM_EVENT'::"NotificationEventType"
            ]
        END
    ) AS event_types("eventType")
),
deduped AS (
    SELECT DISTINCT ON ("familyId", "memberId", "channel", "eventType")
        "id",
        "familyId",
        "memberId",
        "category",
        "eventType",
        "channel",
        "isEnabled",
        "createdAt",
        "updatedAt"
    FROM expanded
    ORDER BY "familyId", "memberId", "channel", "eventType", "updatedAt" DESC, "createdAt" DESC, "id" DESC
)
INSERT INTO "NotificationPreference_next" (
    "id",
    "familyId",
    "memberId",
    "category",
    "eventType",
    "channel",
    "isEnabled",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "familyId",
    "memberId",
    "category",
    "eventType",
    "channel",
    "isEnabled",
    "createdAt",
    "updatedAt"
FROM deduped;

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_familyId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_memberId_fkey";

-- DropTable
DROP TABLE "NotificationPreference";

-- RenameTable
ALTER TABLE "NotificationPreference_next" RENAME TO "NotificationPreference";

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_familyId_memberId_createdAt_idx" ON "PushSubscription"("familyId", "memberId", "createdAt");

-- CreateIndex
CREATE INDEX "PushSubscription_memberId_createdAt_idx" ON "PushSubscription"("memberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_familyId_memberId_channel_eventType_key" ON "NotificationPreference"("familyId", "memberId", "channel", "eventType");

-- CreateIndex
CREATE INDEX "NotificationPreference_familyId_memberId_channel_isEnabled_idx" ON "NotificationPreference"("familyId", "memberId", "channel", "isEnabled");

-- CreateIndex
CREATE INDEX "NotificationPreference_familyId_memberId_channel_category_idx" ON "NotificationPreference"("familyId", "memberId", "channel", "category");

-- CreateIndex
CREATE INDEX "NotificationPreference_memberId_idx" ON "NotificationPreference"("memberId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;