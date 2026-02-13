import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    role: v.union(
      v.literal("Employee"),
      v.literal("Manager"),
      v.literal("Executive"),
      v.literal("Admin")
    ),
    departmentId: v.optional(v.id("departments")),
    tokenIdentifier: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_department", ["departmentId"]),

  // Credentials table for authentication
  credentials: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    userId: v.id("users"),
    sessionToken: v.string(),
    tokenExpiry: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["sessionToken"]),

  // Password reset tokens (short-lived, one-time use)
  passwordResetTokens: defineTable({
    email: v.string(),
    token: v.string(),
    expiry: v.number(),
  }).index("by_token", ["token"]),

  // Departments (e.g., Engineering, Product, Design)
  departments: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_slug", ["slug"]),

  // Job roles for rate configuration (e.g., Engineer, PM, Designer)
  roles: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_slug", ["slug"]),

  // Hourly rates - org default (no departmentId) or department override
  hourlyRates: defineTable({
    roleId: v.id("roles"),
    rateCents: v.number(), // Store in cents for precision
    departmentId: v.optional(v.id("departments")),
  })
    .index("by_role", ["roleId"])
    .index("by_role_department", ["roleId", "departmentId"]),

  // Meetings with embedded attendees
  meetings: defineTable({
    name: v.string(),
    description: v.optional(v.string()), // What the meeting is for
    durationMinutes: v.number(),
    startTime: v.number(), // Unix timestamp in ms
    createdBy: v.id("users"),
    recurring: v.optional(
      v.object({
        frequency: v.union(
          v.literal("daily"),
          v.literal("weekly"),
          v.literal("biweekly"),
          v.literal("monthly")
        ),
        endDate: v.optional(v.number()),
      })
    ),
    attendees: v.array(
      v.object({
        roleId: v.id("roles"),
        departmentId: v.id("departments"),
        count: v.number(),
      })
    ),
  })
    .index("by_creator", ["createdBy"])
    .index("by_start_time", ["startTime"]),

  // App settings (e.g., cost threshold)
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
