# Alumni Influencers Platform (Coursework 2)

## Overview
A comprehensive MVC web application and RESTful API that transforms real-time alumni career data into actionable intelligence for university curriculum development.

## Architecture
The system utilizes a 3-Tier Architecture with clear component separation:
1. **Frontend (View):** Server-Side Rendered (SSR) HTML using EJS templates. Styled with Vanilla CSS (Dark mode, glassmorphism). Hosted by the Express server for seamless session management.
2. **Backend (Controller):** Node.js & Express REST API that handles routing, business logic, session validation, authentication, and data sanitation.
3. **Database (Model):** MongoDB (Mongoose ORM) normalized in 3NF where applicable.

### Database Schema (3NF) Key Entities:
- **Users:** Authenticated accounts linking to roles (admin vs user).
- **Profiles:** 1:1 mapped to Users containing normalized arrays for Degrees, Certifications, and Employment.
- **Bids:** System for the "Alumni of the Day" auction mechanism.
- **ApiKeys:** Securely hashed tokens mapping to granular permissions like `read:alumni_of_day`.
- **UsageLogs:** Unified system recording endpoint accesses to track individual client application usage.

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Copy `.env.example` to `.env` and fill in your MongoDB URI, JWT Secret, and Email configurations.
   ```bash
   cp .env.example .env
   ```

3. **Database Seeding (Optional):**
   Run the seeding scripts to inject an Admin user and test data.
   ```bash
   node create_admin.js
   node seed_winner.js
   ```

4. **Start the Application:**
   ```bash
   npm run dev    # Starts with nodemon for development
   npm run start  # standard production start
   ```

## API Key Security & Scoping
This API enforces granular permission scoping using API Keys for machine-to-machine interactions (e.g. mobile AR apps).

Example scopes:
- `read:alumni_of_day`: Can only access the daily winner endpoint.
- `read:analytics`: Can access dashboard graphing data.

Pass the key using the custom header `x-api-key`.

## Testing the Dashboards
1. Navigate to `http://localhost:3000/`
2. Register an account using an `.ac.uk` or `.edu` email.
3. Check your console log for the Ethereal email verification link.
4. Verify your account and Login to access the Analytics Dashboard, Advanced Charts, and Alumni Directory.
