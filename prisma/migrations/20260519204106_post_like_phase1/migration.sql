-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "memberIdWhoLiked" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");

-- CreateIndex
CREATE INDEX "PostLike_memberIdWhoLiked_idx" ON "PostLike"("memberIdWhoLiked");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_memberIdWhoLiked_key" ON "PostLike"("postId", "memberIdWhoLiked");

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_memberIdWhoLiked_fkey" FOREIGN KEY ("memberIdWhoLiked") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
