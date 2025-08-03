import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { db } from '@/lib/db'

export const userRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        member: true,
        posts: {
          include: {
            taggedMembers: {
              include: {
                member: true
              }
            }
          }
        }
      },
    })
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.user.findUnique({
        where: { id: input.id },
        include: {
          member: true,
          posts: {
            include: {
              taggedMembers: {
                include: {
                  member: true
                }
              }
            }
          }
        },
      })
    }),

  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      return db.user.findUnique({
        where: { email: input.email },
        include: {
          member: true,
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        username: z.string().min(3, 'Username must be at least 3 characters').optional(),
        password: z.string().min(6, 'Password must be at least 6 characters').optional(),
        provider: z.string().optional(),
        providerId: z.string().optional(),
        memberId: z.string(), // Required - user must be linked to a member
      })
    )
    .mutation(async ({ input }) => {
      return db.user.create({
        data: input,
        include: {
          member: true,
        },
      })
    }),

  // Claim a member profile (link existing member to new user account)
  claimMember: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        username: z.string().min(3, 'Username must be at least 3 characters').optional(),
        password: z.string().min(6, 'Password must be at least 6 characters').optional(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // First check if member exists and is unclaimed
      const member = await db.member.findUnique({
        where: { id: input.memberId },
        include: { user: true }
      })

      if (!member) {
        throw new Error('Member not found')
      }

      if (member.user) {
        throw new Error('Member already has a user account')
      }

      // Create user and link to member
      return db.user.create({
        data: {
          email: input.email,
          username: input.username,
          password: input.password,
          memberId: input.memberId,
        },
        include: {
          member: true,
        },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email('Invalid email address').optional(),
        username: z.string().min(3, 'Username must be at least 3 characters').optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return db.user.update({
        where: { id },
        data,
        include: {
          member: true,
        },
      })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.user.delete({
        where: { id: input.id },
      })
    }),
})
