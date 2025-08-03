import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { db } from '@/lib/db'

export const postRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return db.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          include: {
            member: true
          }
        },
        taggedMembers: {
          include: {
            member: true
          }
        }
      },
    })
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.post.findUnique({
        where: { id: input.id },
        include: {
          author: {
            include: {
              member: true
            }
          },
          taggedMembers: {
            include: {
              member: true
            }
          }
        },
      })
    }),

  getByAuthor: publicProcedure
    .input(z.object({ authorId: z.string() }))
    .query(async ({ input }) => {
      return db.post.findMany({
        where: { authorId: input.authorId },
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            include: {
              member: true
            }
          },
          taggedMembers: {
            include: {
              member: true
            }
          }
        },
      })
    }),

  getByTaggedMember: publicProcedure
    .input(z.object({ memberId: z.string() }))
    .query(async ({ input }) => {
      return db.post.findMany({
        where: {
          taggedMembers: {
            some: {
              memberId: input.memberId
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            include: {
              member: true
            }
          },
          taggedMembers: {
            include: {
              member: true
            }
          }
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().optional(),
        content: z.string().min(1, 'Content is required'),
        imageUrls: z.array(z.string().url()).default([]),
        videoUrls: z.array(z.string().url()).default([]),
        isPublic: z.boolean().default(true),
        authorId: z.string(),
        taggedMemberIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const { taggedMemberIds, ...postData } = input

      return db.post.create({
        data: {
          ...postData,
          taggedMembers: {
            create: taggedMemberIds.map(memberId => ({
              memberId
            }))
          }
        },
        include: {
          author: {
            include: {
              member: true
            }
          },
          taggedMembers: {
            include: {
              member: true
            }
          }
        },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().min(1, 'Content is required').optional(),
        imageUrls: z.array(z.string().url()).optional(),
        videoUrls: z.array(z.string().url()).optional(),
        isPublic: z.boolean().optional(),
        taggedMemberIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, taggedMemberIds, ...updateData } = input

      // If taggedMemberIds is provided, update the tags
      if (taggedMemberIds !== undefined) {
        // First delete existing tags
        await db.postMember.deleteMany({
          where: { postId: id }
        })

        // Then create new tags
        if (taggedMemberIds.length > 0) {
          await db.postMember.createMany({
            data: taggedMemberIds.map(memberId => ({
              postId: id,
              memberId
            }))
          })
        }
      }

      return db.post.update({
        where: { id },
        data: updateData,
        include: {
          author: {
            include: {
              member: true
            }
          },
          taggedMembers: {
            include: {
              member: true
            }
          }
        },
      })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.post.delete({
        where: { id: input.id },
      })
    }),
})
