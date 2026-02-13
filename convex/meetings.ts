import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

// Helper to calculate meeting cost
async function calculateMeetingCost(
  ctx: any,
  durationMinutes: number,
  attendees: { roleId: Id<"roles">; departmentId: Id<"departments">; count: number }[]
): Promise<number> {
  let totalCents = 0;

  for (const attendee of attendees) {
    // Try department-specific rate first
    let rate = await ctx.db
      .query("hourlyRates")
      .withIndex("by_role_department", (q: any) =>
        q.eq("roleId", attendee.roleId).eq("departmentId", attendee.departmentId)
      )
      .unique();

    // Fall back to org default
    if (!rate) {
      const rates = await ctx.db
        .query("hourlyRates")
        .withIndex("by_role", (q: any) => q.eq("roleId", attendee.roleId))
        .collect();
      rate = rates.find((r: any) => r.departmentId === undefined);
    }

    if (rate) {
      const hourlyRate = rate.rateCents;
      const hours = durationMinutes / 60;
      totalCents += hourlyRate * hours * attendee.count;
    }
  }

  return Math.round(totalCents);
}

// List meetings with filters and role-based access
export const list = query({
  args: {
    token: v.optional(v.string()),
    from: v.optional(v.number()), // Unix timestamp
    to: v.optional(v.number()),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      return [];
    }

    let meetings = await ctx.db.query("meetings").collect();

    // Filter by date range
    if (args.from) {
      meetings = meetings.filter((m) => m.startTime >= args.from!);
    }
    if (args.to) {
      meetings = meetings.filter((m) => m.startTime <= args.to!);
    }

    // Role-based filtering
    if (user.role === "Employee") {
      // Employees only see meetings they created
      meetings = meetings.filter((m) => m.createdBy === user._id);
    } else if (user.role === "Manager") {
      // Managers see their department's meetings
      if (user.departmentId) {
        meetings = meetings.filter((m) =>
          m.attendees.some((a) => a.departmentId === user.departmentId)
        );
      }
    }
    // Executives and Admins see all meetings

    // Filter by specific department if requested
    if (args.departmentId) {
      meetings = meetings.filter((m) =>
        m.attendees.some((a) => a.departmentId === args.departmentId)
      );
    }

    // Enrich with cost and creator info
    const enrichedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        const cost = await calculateMeetingCost(ctx, meeting.durationMinutes, meeting.attendees);
        const creator = await ctx.db.get(meeting.createdBy);

        // Get role and department names for attendees
        const attendeesWithNames = await Promise.all(
          meeting.attendees.map(async (att) => {
            const role = await ctx.db.get(att.roleId);
            const dept = await ctx.db.get(att.departmentId);
            return {
              ...att,
              roleName: role?.name ?? "Unknown",
              departmentName: dept?.name ?? "Unknown",
            };
          })
        );

        return {
          ...meeting,
          costCents: cost,
          costDollars: cost / 100,
          creatorName: creator?.name ?? "Unknown",
          attendeesWithNames,
        };
      })
    );

    // Sort by start time descending (most recent first)
    return enrichedMeetings.sort((a, b) => b.startTime - a.startTime);
  },
});

// Get a single meeting with full details
export const get = query({
  args: {
    token: v.optional(v.string()),
    id: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      return null;
    }

    const meeting = await ctx.db.get(args.id);
    if (!meeting) {
      return null;
    }

    const cost = await calculateMeetingCost(ctx, meeting.durationMinutes, meeting.attendees);
    const creator = await ctx.db.get(meeting.createdBy);

    // Get role and department names for attendees
    const attendeesWithNames = await Promise.all(
      meeting.attendees.map(async (att) => {
        const role = await ctx.db.get(att.roleId);
        const dept = await ctx.db.get(att.departmentId);
        return {
          ...att,
          roleName: role?.name ?? "Unknown",
          departmentName: dept?.name ?? "Unknown",
        };
      })
    );

    // Get cost threshold setting
    const thresholdSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "costThreshold"))
      .unique();
    const threshold = thresholdSetting?.value ?? 200000; // Default $2000 in cents

    return {
      ...meeting,
      costCents: cost,
      costDollars: cost / 100,
      creatorName: creator?.name ?? "Unknown",
      attendeesWithNames,
      isOverThreshold: cost > threshold,
      thresholdDollars: threshold / 100,
    };
  },
});

// Create a new meeting
export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.number(),
    startTime: v.number(),
    attendees: v.array(
      v.object({
        roleId: v.id("roles"),
        departmentId: v.id("departments"),
        count: v.number(),
      })
    ),
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
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const meetingId = await ctx.db.insert("meetings", {
      name: args.name,
      description: args.description,
      durationMinutes: args.durationMinutes,
      startTime: args.startTime,
      createdBy: user._id,
      attendees: args.attendees,
      recurring: args.recurring,
    });

    // Calculate and return cost
    const cost = await calculateMeetingCost(ctx, args.durationMinutes, args.attendees);

    return {
      id: meetingId,
      costCents: cost,
      costDollars: cost / 100,
    };
  },
});

// Update a meeting
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("meetings"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    startTime: v.optional(v.number()),
    attendees: v.optional(
      v.array(
        v.object({
          roleId: v.id("roles"),
          departmentId: v.id("departments"),
          count: v.number(),
        })
      )
    ),
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
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const meeting = await ctx.db.get(args.id);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Only creator or Admin can update
    if (meeting.createdBy !== user._id && user.role !== "Admin") {
      throw new Error("Not authorized to update this meeting");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.durationMinutes !== undefined) updates.durationMinutes = args.durationMinutes;
    if (args.startTime !== undefined) updates.startTime = args.startTime;
    if (args.attendees !== undefined) updates.attendees = args.attendees;
    if (args.recurring !== undefined) updates.recurring = args.recurring;

    await ctx.db.patch(args.id, updates);

    // Return updated cost
    const updatedMeeting = await ctx.db.get(args.id);
    const cost = await calculateMeetingCost(
      ctx,
      updatedMeeting!.durationMinutes,
      updatedMeeting!.attendees
    );

    return {
      costCents: cost,
      costDollars: cost / 100,
    };
  },
});

// Delete/cancel a meeting
export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("meetings"),
    cancelOnly: v.optional(v.boolean()), // If true, only allow cancelling future meetings
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const meeting = await ctx.db.get(args.id);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Admin can cancel any meeting; otherwise only the creator can cancel their own
    if (user.role !== "Admin" && meeting.createdBy !== user._id) {
      throw new Error("Only the meeting creator or an admin can cancel this meeting");
    }

    // If cancelOnly flag is set, only allow cancelling future meetings
    if (args.cancelOnly && meeting.startTime <= Date.now()) {
      throw new Error("Cannot cancel past meetings");
    }

    // Calculate savings before deleting
    const cost = await calculateMeetingCost(ctx, meeting.durationMinutes, meeting.attendees);

    await ctx.db.delete(args.id);

    return {
      savingsCents: cost,
      savingsDollars: cost / 100,
    };
  },
});
