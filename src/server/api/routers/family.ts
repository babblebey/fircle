import { TRPCError } from "@trpc/server"
import { Prisma } from "../../../../generated/prisma"
import { z } from "zod"

import { normalizeFamilyNameInput } from "~/lib/family-name"
import { brandingConfigSchema } from "~/lib/branding/branding-config"
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc"

const internalMediaUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => value.startsWith("/api/media/r2/"), "Invalid url")

const familyImageInputSchema = z.union([z.string().url().max(2048), internalMediaUrlSchema])

const updateFamilyIdentityInputSchema = z.object({
  familyId: z.string().cuid(),
  name: z
    .string()
    .max(120)
    .transform(normalizeFamilyNameInput)
    .refine((value) => value.length > 0, {
      message: "Family name is required",
    }),
  description: z.string().trim().max(500).nullable(),
  image: familyImageInputSchema.nullable(),
  brandingConfig: brandingConfigSchema.nullable().optional(),
})

function isMissingBrandingConfigColumnError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false
  }

  if (error.code !== "P2022") {
    return false
  }

  const column = (error.meta as { column?: unknown } | undefined)?.column
  return typeof column === "string" && column.includes("Family.brandingConfig")
}

function resolveBrandingConfigOutput(value: unknown) {
  const parsed = brandingConfigSchema.safeParse(value)

  return parsed.success ? parsed.data : null
}

export const familyRouter = createTRPCRouter({
  /**
   * Protected query: Resolve invite management context for current user.
   * Returns primary family and whether invite management actions are allowed.
   */
  getManagementContext: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.familyMember.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        familyId: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    const manageableMembership = memberships.find(
      (membership) => membership.role === "ADMIN" || membership.role === "OWNER",
    )

    const selectedMembership = manageableMembership ?? memberships[0] ?? null

    let selectedFamily:
      | {
          id: string
          name: string
          description: string | null
          image: string | null
          brandingConfig: unknown
        }
      | {
          id: string
          name: string
          description: string | null
          image: string | null
          brandingConfig: null
        }
      | null = null

    if (selectedMembership) {
      try {
        selectedFamily = await ctx.db.family.findUnique({
          where: { id: selectedMembership.familyId },
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
            brandingConfig: true,
          },
        })
      } catch (error) {
        if (!isMissingBrandingConfigColumnError(error)) {
          throw error
        }

        // Backward compatibility for databases where brandingConfig migration
        // has not been applied yet.
        const legacyFamily = await ctx.db.family.findUnique({
          where: { id: selectedMembership.familyId },
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
          },
        })

        selectedFamily = legacyFamily
          ? {
              ...legacyFamily,
              brandingConfig: null,
            }
          : null
      }
    }

    return {
      family: selectedFamily
        ? {
            id: selectedFamily.id,
            name: selectedFamily.name,
            description: selectedFamily.description,
            image: selectedFamily.image,
            brandingConfig: resolveBrandingConfigOutput(selectedFamily.brandingConfig),
          }
        : null,
      role: selectedMembership?.role ?? null,
      canManageInvites:
        selectedMembership?.role === "ADMIN" || selectedMembership?.role === "OWNER",
    }
  }),

  updateFamilyIdentity: protectedProcedure
    .input(updateFamilyIdentityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: input.familyId,
            userId: ctx.session.user.id,
          },
        },
        select: {
          id: true,
          role: true,
        },
      })

      if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage family identity",
        })
      }

      const brandingConfigUpdateValue =
        input.brandingConfig === undefined
          ? undefined
          : (input.brandingConfig ?? Prisma.JsonNull)

      const updatedFamily = await ctx.db.family.update({
        where: { id: input.familyId },
        data: {
          name: input.name,
          description: input.description,
          image: input.image,
          ...(brandingConfigUpdateValue === undefined
            ? {}
            : { brandingConfig: brandingConfigUpdateValue }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          brandingConfig: true,
        },
      })

      return {
        ...updatedFamily,
        brandingConfig: resolveBrandingConfigOutput(updatedFamily.brandingConfig),
      }
    }),
})
