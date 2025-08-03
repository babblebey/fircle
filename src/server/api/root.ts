import { createTRPCRouter } from './trpc'
import { memberRouter } from './routers/member'
import { userRouter } from './routers/user'
import { postRouter } from './routers/post'
// Keep the old familyMember router for backward compatibility during migration
import { familyMemberRouter } from './routers/familyMember'

export const appRouter = createTRPCRouter({
  // New routers based on updated schema
  member: memberRouter,
  user: userRouter,
  post: postRouter,
  // Keep old router for backward compatibility
  familyMember: familyMemberRouter,
})

export type AppRouter = typeof appRouter
