import { mutation } from "./_generated/server";

// Seed the database with initial data
// Run this once after setting up the project: npx convex run seed:run
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingRoles = await ctx.db.query("roles").collect();
    if (existingRoles.length > 0) {
      return { message: "Database already seeded" };
    }

    // Create departments
    const engineeringId = await ctx.db.insert("departments", {
      name: "Engineering",
      slug: "engineering",
    });
    const productId = await ctx.db.insert("departments", {
      name: "Product",
      slug: "product",
    });
    const designId = await ctx.db.insert("departments", {
      name: "Design",
      slug: "design",
    });
    const marketingId = await ctx.db.insert("departments", {
      name: "Marketing",
      slug: "marketing",
    });
    const salesId = await ctx.db.insert("departments", {
      name: "Sales",
      slug: "sales",
    });

    // Create job roles
    const engineerId = await ctx.db.insert("roles", {
      name: "Engineer",
      slug: "engineer",
    });
    const pmId = await ctx.db.insert("roles", {
      name: "Product Manager",
      slug: "pm",
    });
    const designerId = await ctx.db.insert("roles", {
      name: "Designer",
      slug: "designer",
    });
    const marketerID = await ctx.db.insert("roles", {
      name: "Marketer",
      slug: "marketer",
    });
    const salesRepId = await ctx.db.insert("roles", {
      name: "Sales Rep",
      slug: "sales-rep",
    });
    const executiveId = await ctx.db.insert("roles", {
      name: "Executive",
      slug: "executive",
    });

    // Create default hourly rates (org-wide)
    await ctx.db.insert("hourlyRates", {
      roleId: engineerId,
      rateCents: 15000, // $150/hr
    });
    await ctx.db.insert("hourlyRates", {
      roleId: pmId,
      rateCents: 12000, // $120/hr
    });
    await ctx.db.insert("hourlyRates", {
      roleId: designerId,
      rateCents: 10000, // $100/hr
    });
    await ctx.db.insert("hourlyRates", {
      roleId: marketerID,
      rateCents: 8000, // $80/hr
    });
    await ctx.db.insert("hourlyRates", {
      roleId: salesRepId,
      rateCents: 7500, // $75/hr
    });
    await ctx.db.insert("hourlyRates", {
      roleId: executiveId,
      rateCents: 25000, // $250/hr
    });

    // Create a department override example: Engineers in Marketing cost more
    await ctx.db.insert("hourlyRates", {
      roleId: engineerId,
      rateCents: 17500, // $175/hr for engineers in marketing
      departmentId: marketingId,
    });

    // Set default cost threshold
    await ctx.db.insert("settings", {
      key: "costThreshold",
      value: 200000, // $2000 in cents
    });

    return {
      message: "Database seeded successfully",
      departments: 5,
      roles: 6,
      rates: 7,
    };
  },
});
