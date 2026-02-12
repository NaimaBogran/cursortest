import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple password hashing (for demo - in production use bcrypt via action)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Add salt and convert to string
  return "hash_" + Math.abs(hash).toString(36) + "_" + password.length;
}

// Generate session token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Sign up a new user
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    
    if (existing) {
      throw new Error("An account with this email already exists");
    }

    // Hash password
    const passwordHash = simpleHash(args.password);
    
    // Generate session token
    const sessionToken = generateToken();
    const tokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Check if this is the first user (make them Admin)
    const existingUsers = await ctx.db.query("users").first();
    const role = existingUsers ? "Employee" : "Admin";

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      name: args.name,
      role: role,
      tokenIdentifier: sessionToken,
    });

    // Store credentials
    await ctx.db.insert("credentials", {
      email: args.email.toLowerCase(),
      passwordHash,
      userId,
      sessionToken,
      tokenExpiry,
    });

    return {
      success: true,
      token: sessionToken,
      userId: userId,
    };
  },
});

// Sign in existing user
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find credentials
    const creds = await ctx.db
      .query("credentials")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!creds) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const passwordHash = simpleHash(args.password);
    if (creds.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password");
    }

    // Generate new session token
    const sessionToken = generateToken();
    const tokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Update session
    await ctx.db.patch(creds._id, {
      sessionToken,
      tokenExpiry,
    });

    // Update user's tokenIdentifier
    await ctx.db.patch(creds.userId, {
      tokenIdentifier: sessionToken,
    });

    return {
      success: true,
      token: sessionToken,
      userId: creds.userId,
    };
  },
});

// Sign out (invalidate session)
export const signOut = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const creds = await ctx.db
      .query("credentials")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.token))
      .first();

    if (creds) {
      await ctx.db.patch(creds._id, {
        sessionToken: "",
        tokenExpiry: 0,
      });
    }

    return { success: true };
  },
});

// Validate session token and get user
export const validateSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const creds = await ctx.db
      .query("credentials")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.token))
      .first();

    if (!creds || creds.tokenExpiry < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(creds.userId);
    return user;
  },
});
