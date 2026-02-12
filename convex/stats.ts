import { v } from "convex/values";
import { query } from "./_generated/server";
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
    let rate = await ctx.db
      .query("hourlyRates")
      .withIndex("by_role_department", (q: any) =>
        q.eq("roleId", attendee.roleId).eq("departmentId", attendee.departmentId)
      )
      .unique();

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

// Get cost statistics for dashboard
export const getCosts = query({
  args: {
    token: v.optional(v.string()),
    period: v.union(v.literal("week"), v.literal("month")),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      return null;
    }

    // Calculate time range
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const from = args.period === "week" ? now - 7 * msPerDay : now - 30 * msPerDay;

    // Get all meetings in range
    let meetings = await ctx.db.query("meetings").collect();
    meetings = meetings.filter((m) => m.startTime >= from && m.startTime <= now);

    // Role-based filtering
    if (user.role === "Employee") {
      meetings = meetings.filter((m) => m.createdBy === user._id);
    } else if (user.role === "Manager" && user.departmentId) {
      meetings = meetings.filter((m) =>
        m.attendees.some((a) => a.departmentId === user.departmentId)
      );
    }

    // Filter by specific department if requested
    if (args.departmentId) {
      meetings = meetings.filter((m) =>
        m.attendees.some((a) => a.departmentId === args.departmentId)
      );
    }

    // Calculate costs
    let totalCents = 0;
    const costByDepartment: Record<string, { id: string; name: string; costCents: number }> = {};
    const costByRole: Record<string, { id: string; name: string; costCents: number }> = {};
    const meetingCosts: { meeting: any; costCents: number }[] = [];

    for (const meeting of meetings) {
      const meetingCost = await calculateMeetingCost(ctx, meeting.durationMinutes, meeting.attendees);
      totalCents += meetingCost;
      meetingCosts.push({ meeting, costCents: meetingCost });

      // Breakdown by attendee
      for (const attendee of meeting.attendees) {
        // Calculate this attendee's contribution
        let rate = await ctx.db
          .query("hourlyRates")
          .withIndex("by_role_department", (q: any) =>
            q.eq("roleId", attendee.roleId).eq("departmentId", attendee.departmentId)
          )
          .unique();

        if (!rate) {
          const rates = await ctx.db
            .query("hourlyRates")
            .withIndex("by_role", (q: any) => q.eq("roleId", attendee.roleId))
            .collect();
          rate = rates.find((r: any) => r.departmentId === undefined);
        }

        if (rate) {
          const attendeeCost = Math.round(
            (rate.rateCents * (meeting.durationMinutes / 60) * attendee.count)
          );

          // By department
          const deptId = attendee.departmentId.toString();
          if (!costByDepartment[deptId]) {
            const dept = await ctx.db.get(attendee.departmentId);
            costByDepartment[deptId] = {
              id: deptId,
              name: dept?.name ?? "Unknown",
              costCents: 0,
            };
          }
          costByDepartment[deptId].costCents += attendeeCost;

          // By role
          const roleId = attendee.roleId.toString();
          if (!costByRole[roleId]) {
            const role = await ctx.db.get(attendee.roleId);
            costByRole[roleId] = {
              id: roleId,
              name: role?.name ?? "Unknown",
              costCents: 0,
            };
          }
          costByRole[roleId].costCents += attendeeCost;
        }
      }
    }

    // Sort meetings by cost (most expensive first)
    meetingCosts.sort((a, b) => b.costCents - a.costCents);
    const topMeetings = meetingCosts.slice(0, 5).map((mc) => ({
      id: mc.meeting._id,
      name: mc.meeting.name,
      costCents: mc.costCents,
      costDollars: mc.costCents / 100,
      durationMinutes: mc.meeting.durationMinutes,
      startTime: mc.meeting.startTime,
    }));

    return {
      period: args.period,
      totalCents,
      totalDollars: totalCents / 100,
      meetingCount: meetings.length,
      costByDepartment: Object.values(costByDepartment).map((d) => ({
        ...d,
        costDollars: d.costCents / 100,
      })),
      costByRole: Object.values(costByRole).map((r) => ({
        ...r,
        costDollars: r.costCents / 100,
      })),
      topMeetings,
    };
  },
});

// Get settings (like cost threshold)
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const threshold = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "costThreshold"))
      .unique();

    return {
      costThresholdCents: threshold?.value ?? 200000, // Default $2000
      costThresholdDollars: (threshold?.value ?? 200000) / 100,
    };
  },
});
