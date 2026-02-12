import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get user from session token
async function getUserFromToken(ctx: any, token: string | undefined) {
  if (!token) return null;
  
  const creds = await ctx.db
    .query("credentials")
    .withIndex("by_token", (q: any) => q.eq("sessionToken", token))
    .first();
  
  if (!creds || creds.tokenExpiry < Date.now()) {
    return null;
  }
  
  return await ctx.db.get(creds.userId);
}

// List all rates with role and department info
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rates = await ctx.db.query("hourlyRates").collect();
    
    // Enrich with role and department names
    const enrichedRates = await Promise.all(
      rates.map(async (rate) => {
        const role = await ctx.db.get(rate.roleId);
        let department = null;
        if (rate.departmentId) {
          department = await ctx.db.get(rate.departmentId);
        }
        return {
          ...rate,
          roleName: role?.name ?? "Unknown",
          roleSlug: role?.slug ?? "unknown",
          departmentName: department?.name ?? null,
          departmentSlug: department?.slug ?? null,
        };
      })
    );

    return enrichedRates;
  },
});

// Get rate for a specific role (and optionally department)
export const getRate = query({
  args: {
    roleId: v.id("roles"),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    // First try to find department-specific rate
    if (args.departmentId) {
      const deptRate = await ctx.db
        .query("hourlyRates")
        .withIndex("by_role_department", (q) =>
          q.eq("roleId", args.roleId).eq("departmentId", args.departmentId)
        )
        .unique();
      if (deptRate) {
        return deptRate;
      }
    }

    // Fall back to org default (no departmentId)
    const rates = await ctx.db
      .query("hourlyRates")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();

    // Find the one without departmentId (org default)
    return rates.find((r) => r.departmentId === undefined) ?? null;
  },
});

// Set rate for a role (Admin only)
// If departmentId is provided, sets department override; otherwise sets org default
export const setRate = mutation({
  args: {
    token: v.string(),
    roleId: v.id("roles"),
    rateCents: v.number(),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    if (user.role !== "Admin") {
      throw new Error("Only admins can set rates");
    }

    // Check if rate already exists
    let existingRate;
    if (args.departmentId) {
      existingRate = await ctx.db
        .query("hourlyRates")
        .withIndex("by_role_department", (q) =>
          q.eq("roleId", args.roleId).eq("departmentId", args.departmentId)
        )
        .unique();
    } else {
      const rates = await ctx.db
        .query("hourlyRates")
        .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
        .collect();
      existingRate = rates.find((r) => r.departmentId === undefined);
    }

    if (existingRate) {
      // Update existing rate
      await ctx.db.patch(existingRate._id, { rateCents: args.rateCents });
      return existingRate._id;
    } else {
      // Create new rate
      return await ctx.db.insert("hourlyRates", {
        roleId: args.roleId,
        rateCents: args.rateCents,
        departmentId: args.departmentId,
      });
    }
  },
});

// Delete a rate override (Admin only)
export const removeOverride = mutation({
  args: {
    token: v.string(),
    id: v.id("hourlyRates"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    if (user.role !== "Admin") {
      throw new Error("Only admins can delete rate overrides");
    }

    const rate = await ctx.db.get(args.id);
    if (!rate) {
      throw new Error("Rate not found");
    }

    // Don't allow deleting org defaults (only overrides)
    if (!rate.departmentId) {
      throw new Error("Cannot delete org default rate, only overrides");
    }

    await ctx.db.delete(args.id);
  },
});
