ALTER TABLE "User" ADD COLUMN "familyId" TEXT;

WITH resolved_family AS (
  SELECT
    "User"."id",
    COALESCE(
      (
        SELECT fm."familyId"
        FROM "FamilyMember" fm
        WHERE fm."userId" = "User"."id"
        ORDER BY fm."createdAt" ASC
        LIMIT 1
      ),
      (
        SELECT inv."familyId"
        FROM "Invite" inv
        WHERE inv."createdById" = "User"."id"
        ORDER BY inv."createdAt" ASC
        LIMIT 1
      ),
      (
        SELECT inv."familyId"
        FROM "Invite" inv
        WHERE inv."claimedById" = "User"."id"
        ORDER BY inv."createdAt" ASC
        LIMIT 1
      )
    ) AS family_id
  FROM "User"
)
UPDATE "User" u
SET "familyId" = resolved_family.family_id
FROM resolved_family
WHERE u."id" = resolved_family."id";

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";

CREATE INDEX "User_familyId_idx" ON "User"("familyId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "User_familyId_email_key" ON "User"("familyId", "email");

ALTER TABLE "User"
ADD CONSTRAINT "User_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
