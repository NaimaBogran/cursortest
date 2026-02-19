import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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

// Get currently authenticated user
export const getCurrentUser = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await getUserFromToken(ctx, args.token);
  },
});

// Update own profile
export const updateProfile = mutation({
  args: {
    token: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(user._id, {
      name: args.name ?? user.name,
    });
    
    return user._id;
  },
});

// Update user role (Admin only)
export const updateUserRole = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    role: v.union(
      v.literal("Employee"),
      v.literal("Manager"),
      v.literal("Executive"),
      v.literal("Admin")
    ),
  },
  handler: async (ctx, args) => {
    let currentUser = await getUserFromToken(ctx, args.token);
    if (!currentUser) {
      // Fallback: find user by tokenIdentifier (session token stored on user)
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", args.token))
        .unique();
    }
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    if (currentUser.role !== "Admin") {
      throw new Error("Only admins can update user roles");
    }

    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// Update user department (Admin only)
export const updateUserDepartment = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    let currentUser = await getUserFromToken(ctx, args.token);
    if (!currentUser) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", args.token))
        .unique();
    }
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    if (currentUser.role !== "Admin") {
      throw new Error("Only admins can update user departments");
    }

    await ctx.db.patch(args.userId, { departmentId: args.departmentId });
  },
});

// Promote first user to Admin (one-time setup).
// Internal only: not callable from the client. Use from a one-off script or Convex dashboard if needed.
export const promoteFirstUserToAdmin = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    if (users.length === 1 && users[0].role === "Employee") {
      await ctx.db.patch(users[0]._id, { role: "Admin" });
      return { success: true, message: "First user promoted to Admin" };
    }
    return { success: false, message: "Cannot promote: either no users or multiple users exist" };
  },
});

// List all users (Admin only)
export const listUsers = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let currentUser = await getUserFromToken(ctx, args.token);
    if (!currentUser && args.token) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", args.token))
        .unique();
    }
    if (!currentUser || currentUser.role !== "Admin") {
      return [];
    }

    const users = await ctx.db.query("users").collect();
    
    // Get department names for each user
    const usersWithDepartments = await Promise.all(
      users.map(async (user) => {
        let departmentName = null;
        if (user.departmentId) {
          const dept = await ctx.db.get(user.departmentId);
          departmentName = dept?.name ?? null;
        }
        return { ...user, departmentName };
      })
    );

    return usersWithDepartments;
  },
});
