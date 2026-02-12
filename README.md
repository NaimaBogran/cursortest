# Meeting Tax

**See the true cost of your meetings.** Meeting Tax helps leadership understand the real financial impact of meetings by translating time into dollars.

> "This app helps leadership understand the real financial impact of meetings by translating time into dollars."

## Features

### Core Features
- **Track Meeting Costs** - Create meetings with attendees and see instant cost calculations
- **Role-Based Rates** - Configure hourly rates by job role (Engineer, PM, Designer, etc.)
- **Department Overrides** - Set different rates for specific departments
- **Dashboard Analytics** - View costs by week/month, department, and role
- **Threshold Alerts** - Flag meetings that exceed cost limits
- **Calendar View** - See meeting costs on a calendar
- **Role-Based Access** - Employee, Manager, Executive, and Admin roles

### Smart UX Touches
- "This meeting cost $3,420" - instant feedback after creating a meeting
- "That's more than a MacBook Pro!" - fun cost comparisons
- Recurring meeting multiplier: "Recurring 4x/month = ~$13,680/month"
- "Cancel meeting" savings simulation
- Threshold warnings for expensive meetings

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | EJS templates + Vanilla JavaScript |
| Backend | Convex (serverless functions + database) |
| Auth | Convex Auth (email/password) |
| Hosting | Vercel (frontend) + Convex Cloud (backend) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Convex account (free at [convex.dev](https://convex.dev))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/meeting-tax.git
   cd meeting-tax
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Convex:**
   ```bash
   npx convex dev --once --configure=new
   ```
   This will open a browser to authenticate and create a new Convex project.

4. **Set the AUTH_SECRET environment variable:**
   
   Go to your Convex dashboard → Settings → Environment Variables and add:
   - `AUTH_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

5. **Push Convex functions:**
   ```bash
   npx convex dev --once
   ```

6. **Seed the database with initial data:**
   ```bash
   npm run seed
   ```

7. **Start development:**
   
   Terminal 1 - Convex backend:
   ```bash
   npm run dev
   ```
   
   Terminal 2 - Frontend server:
   ```bash
   npx serve public -l 3000
   ```

8. **Open the app:**
   
   Open http://localhost:3000 in your browser

9. **Configure Convex URL in browser:**
   - Open browser console (F12)
   - Run: `ConvexApp.setConvexUrl('https://your-deployment.convex.cloud')`
   - Find your URL in `.env.local` or Convex dashboard

### First User Setup

The first user to sign up automatically becomes an **Admin**. As Admin, you can:
- Configure hourly rates for each role
- Set department-specific rate overrides  
- Manage user roles (assign Manager, Executive, Admin to others)
- Set cost threshold for warnings

## User Roles

| Role | Permissions |
|------|-------------|
| **Employee** | Create/view own meetings, limited dashboard |
| **Manager** | View department costs and meetings |
| **Executive** | View org-wide analytics |
| **Admin** | Manage rates, users, settings |

## Project Structure

```
meeting-tax/
├── convex/                 # Convex backend
│   ├── schema.ts           # Database schema
│   ├── auth.config.ts      # Auth configuration
│   ├── auth.ts             # Auth exports
│   ├── http.ts             # HTTP routes for auth
│   ├── users.ts            # User management
│   ├── meetings.ts         # Meeting CRUD + cost calculation
│   ├── rates.ts            # Rate configuration
│   ├── departments.ts      # Department CRUD
│   ├── roles.ts            # Role CRUD
│   ├── stats.ts            # Dashboard statistics
│   ├── settings.ts         # App settings
│   └── seed.ts             # Seed data
├── views/                  # EJS templates
│   ├── partials/
│   │   ├── header.ejs      # Navigation header
│   │   └── footer.ejs      # Scripts footer
│   ├── admin/
│   │   └── users.ejs       # User management (Admin)
│   ├── index.ejs           # Landing page
│   ├── login.ejs           # Login page
│   ├── signup.ejs          # Signup page
│   ├── profile.ejs         # Profile completion
│   ├── dashboard.ejs       # Main dashboard
│   ├── meetings.ejs        # Meeting list & creation
│   ├── meeting-detail.ejs  # Single meeting view
│   ├── rates.ejs           # Rate configuration (Admin)
│   └── calendar.ejs        # Calendar view
├── public/                 # Static assets
│   ├── css/
│   │   └── style.css       # Main styles
│   └── js/
│       ├── convex-client.js  # Convex client setup
│       ├── auth.js           # Authentication logic
│       ├── nav.js            # Navigation & helpers
│       ├── index.js          # Landing page
│       ├── login.js          # Login logic
│       ├── signup.js         # Signup logic
│       ├── profile.js        # Profile logic
│       ├── dashboard.js      # Dashboard logic
│       ├── meetings.js       # Meetings page logic
│       ├── meeting-detail.js # Meeting detail logic
│       ├── rates.js          # Rate config logic
│       ├── calendar.js       # Calendar logic
│       └── admin-users.js    # User management logic
├── api/                    # Vercel serverless functions
│   └── render.js           # EJS renderer
├── package.json
├── vercel.json             # Vercel configuration
└── .env.local              # Environment variables (generated)
```

## Database Schema

### Tables

- **users** - User accounts with roles and department assignments
- **departments** - Organization departments (Engineering, Product, Design, etc.)
- **roles** - Job roles for rate configuration (Engineer, PM, Designer, etc.)
- **hourlyRates** - Hourly rates by role with optional department overrides
- **meetings** - Meeting records with attendees and costs
- **settings** - App settings (cost threshold, etc.)

### Default Seed Data

**Departments:** Engineering, Product, Design, Marketing, Sales

**Roles & Rates:**
| Role | Default Rate |
|------|--------------|
| Engineer | $150/hr |
| Product Manager | $120/hr |
| Designer | $100/hr |
| Marketer | $80/hr |
| Sales Rep | $75/hr |
| Executive | $250/hr |

## Deploy to Vercel

1. **Push your code to GitHub**

2. **Deploy to Convex production:**
   ```bash
   npx convex deploy
   ```

3. **Connect to Vercel:**
   ```bash
   npx vercel
   ```

4. **Set environment variables in Vercel:**
   - `CONVEX_URL` - Your Convex production deployment URL

5. **Deploy:**
   ```bash
   npx vercel --prod
   ```

## Demo Script

1. **Pitch:** "This app helps leadership understand the real financial impact of meetings by translating time into dollars."

2. **Sign up** as Admin (first user) → Go to Rates → Configure:
   - Engineer: $150/hr
   - PM: $120/hr  
   - Designer: $100/hr

3. **Create a meeting:** "Q1 Planning"
   - Duration: 2 hours
   - Attendees: 5 Engineers + 2 PMs
   - Result: "This meeting cost $1,740"

4. **Dashboard:** Show "Meetings cost us $X this week"
   - Cost breakdown by department
   - Cost breakdown by role
   - Most expensive meetings list

5. **Role switching:**
   - Manager view: scoped to their department
   - Executive view: org-wide analytics

6. **Smart features:**
   - Threshold warning on expensive meetings
   - "Cancel meeting" shows potential savings
   - Recurring meeting cost projection

## API Reference

### Convex Functions

#### Queries
- `users:getCurrentUser` - Get authenticated user
- `users:listUsers` - List all users (Admin only)
- `departments:list` - List departments
- `roles:list` - List job roles
- `rates:list` - List all rates with overrides
- `rates:getRate` - Get rate for role/department
- `meetings:list` - List meetings (filtered by role)
- `meetings:get` - Get single meeting with cost
- `stats:getCosts` - Get dashboard statistics
- `stats:getSettings` - Get app settings

#### Mutations
- `users:createOrUpdateUser` - Update user profile
- `users:updateUserRole` - Change user role (Admin)
- `users:updateUserDepartment` - Change user department (Admin)
- `departments:create/update/remove` - Manage departments (Admin)
- `roles:create/update/remove` - Manage roles (Admin)
- `rates:setRate` - Set hourly rate (Admin)
- `rates:removeOverride` - Remove rate override (Admin)
- `meetings:create/update/remove` - Manage meetings
- `settings:set` - Update settings (Admin)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
