import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all departments
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("departments").collect();
  },
});

// Get a single department
export const get = query({
  args: { id: v.id("departments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a department (Admin only)
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user || user.role !== "Admin") {
      throw new Error("Only admins can create departments");
    }

    // Check if slug already exists
    const existing = await ctx.db
      .query("departments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error("Department with this slug already exists");
    }

    return await ctx.db.insert("departments", {
      name: args.name,
      slug: args.slug,
    });
  },
});

// Update a department (Admin only)
export const update = mutation({
  args: {
    id: v.id("departments"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user || user.role !== "Admin") {
      throw new Error("Only admins can update departments");
    }

    const updates: { name?: string; slug?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.slug !== undefined) updates.slug = args.slug;

    await ctx.db.patch(args.id, updates);
  },
});

// Delete a department (Admin only)
export const remove = mutation({
  args: { id: v.id("departments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user || user.role !== "Admin") {
      throw new Error("Only admins can delete departments");
    }

    await ctx.db.delete(args.id);
  },
});
