# AI-Based Industrial Waste Exchange Platform

## 1. Project Overview

The AI-Based Industrial Waste Exchange Platform is a web application designed to connect industries that generate waste or surplus materials with industries that can reuse those materials as raw materials or resources.

The platform aims to reduce industrial waste disposal, improve resource utilization, encourage material reuse, and support a circular economy.

Companies can register, publish available materials, search for materials they need, receive compatibility-based recommendations, manage exchange requests, and view estimated environmental benefits.

This project is being developed as a hackathon/mini-project prototype.

## 2. Problem Statement

Industries generate waste and surplus materials that may still have economic or industrial value. However, finding suitable buyers or industries that can reuse these materials can be difficult when information is scattered across different sources.

Manual identification of suitable materials, comparison of quantities and quality, coordination between companies, and transportation planning can be time-consuming.

The proposed platform provides a centralized digital marketplace where industries can discover reuse opportunities, manage material exchanges, and estimate potential economic and environmental benefits.

## 3. Project Objectives

The primary objectives are:

1. Provide secure registration and login for companies.
2. Allow companies to create, view, update, and manage material listings.
3. Help material seekers discover suitable available materials.
4. Implement a material matching system based on category, quantity, quality, and location.
5. Allow companies to send and manage exchange requests.
6. Track exchange status from request to completion.
7. Provide a dashboard with material, matching, and exchange statistics.
8. Estimate transportation costs when sufficient distance and pricing data are available.
9. Estimate waste reuse and potential environmental impact using documented assumptions.
10. Maintain structured company, material, and transaction data in PostgreSQL.

## 4. Target Users

### Waste Providers
Companies that generate industrial waste or surplus materials and want to sell, transfer, or make them available for reuse.

### Material Seekers
Companies that need industrial by-products, surplus materials, or reusable resources for their operations.

### Companies Acting as Both
Companies that generate some surplus materials while requiring other materials.

## 5. Core Features

### Authentication and Company Profiles
- Company registration and login.
- User session management.
- Company profile management.
- Role-based access to application features.
- Secure access to company-specific data.

### Material Listings
- Create and manage material listings.
- Specify material name, category, description, quantity, unit, quality, location, and availability.
- Optionally provide price, images, and handling requirements.
- Search, filter, and sort available listings.

### Material Matching
Recommend potentially suitable materials using:
- Material category or type compatibility.
- Available quantity and required quantity.
- Quality and specification compatibility.
- Geographic distance or location compatibility.

The initial implementation should use a transparent rule-based matching algorithm. The architecture may support future AI or machine-learning enhancements.

Do not claim that a trained AI model is implemented unless one has actually been integrated and tested.

### Exchange Request Management
- Send a request for a listed material.
- View received and sent requests.
- Accept or reject requests.
- Track request status.
- Record completed exchanges.

Suggested statuses:
- Pending
- Accepted
- Rejected
- In Transit
- Completed
- Cancelled

### Dashboard
Display useful statistics such as:
- Total material listings.
- Available materials.
- Potential matches.
- Pending exchange requests.
- Completed exchanges.
- Estimated quantities of waste reused.
- Estimated cost savings.

### Environmental Impact
Display estimates for:
- Waste diverted for reuse.
- Materials exchanged.
- Potential CO₂ emissions avoided.
- Estimated cost savings.
- Trends in material reuse.

All environmental figures must be labeled as estimates unless supported by verified measurement methods and reliable conversion factors.

### Transportation Cost Estimation
Provide a basic estimate based on distance, material quantity where relevant, and a configurable transportation cost rate.

Clearly distinguish estimated costs from actual quotations.

## 6. Technology Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- React Router
- Bootstrap or React Bootstrap
- Recharts for data visualization

### Backend
- Node.js
- Express.js
- JavaScript REST APIs

### Database and Authentication
- Supabase PostgreSQL database
- Supabase Auth
- Supabase Row Level Security (RLS)
- Supabase Storage for optional material images

### Development Tools
- Visual Studio Code
- Git
- GitHub
- Postman for API testing

## 7. System Architecture

The application follows a frontend-backend-database architecture.

### Frontend
The React application provides the user interface, forms, dashboards, listings, matching results, and exchange management screens.

### Backend
The Node.js and Express.js backend handles custom API endpoints, material matching, request processing, validation, and business logic.

### Database
Supabase provides a hosted PostgreSQL database for structured application data and Supabase Auth for identity management.

### Data Flow
1. A company registers or logs in.
2. The user interacts with the React frontend.
3. The frontend calls the backend API for business operations.
4. The backend validates input and performs authorized database operations.
5. The database stores or retrieves the required information.
6. The backend returns results to the frontend.
7. The frontend displays updated listings, recommendations, requests, or statistics.

Use Supabase Auth for identity management. The backend must verify user identity and authorization for protected operations. Do not trust user IDs or company IDs supplied by the frontend without validation.

## 8. Suggested Project Structure

```text
Industrial-Waste-Exchange-/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   │   └── images/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── Sidebar.js
│   │   │   ├── Footer.js
│   │   │   ├── StatCard.js
│   │   │   ├── MaterialCard.js
│   │   │   └── MatchCard.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── CompanyProfile.js
│   │   │   ├── MaterialListings.js
│   │   │   ├── AddMaterial.js
│   │   │   ├── MatchingResults.js
│   │   │   ├── ExchangeRequests.js
│   │   │   └── EnvironmentalImpact.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── supabase.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── schema.sql
│   └── README.md
│
├── .gitignore
└── README.md
```

This is the intended structure. Inspect the actual repository before creating files, and preserve existing working code.

## 9. Suggested Database Design

Use PostgreSQL relational tables with primary keys, foreign keys, timestamps, constraints, and appropriate indexes.

### companies
Stores company information, including name, industry, location, contact details, and account association.

### materials
Stores material listings, including provider company, material name, category, description, available quantity, unit, quality, location, price, availability, and status.

### matches
Stores generated matching recommendations when persistence is needed, including the related material records, match score, and explanation.

### exchange_requests
Stores requests between companies, including requested material, buyer, provider, quantity, proposed price, status, and timestamps.

### exchanges
Stores finalized exchange details, including agreed quantity, transaction status, completion time, and other relevant transaction information.

Use Supabase Auth user IDs to associate accounts with company profiles. Define appropriate relationships and access policies before connecting the application.

Do not store plaintext passwords in application tables.

## 10. Material Matching Logic

The first version should implement a transparent, rule-based matching service.

Suggested matching criteria:
- Material compatibility: 40%
- Quantity compatibility: 20%
- Location compatibility: 20%
- Quality/specification compatibility: 20%

These weights are initial design assumptions and should be configurable and tested.

The algorithm should:
1. Find available candidate listings.
2. Exclude listings that are unavailable or incompatible.
3. Compare material categories and specifications.
4. Evaluate whether available quantity meets the seeker's requirements.
5. Estimate geographic suitability where location data is available.
6. Calculate a normalized match score.
7. Return the best matches with explanations.

Do not fabricate missing distance, quality, or environmental data. Clearly identify unavailable values and handle them consistently.

The matching score is a recommendation indicator, not a guarantee that two materials are technically or legally interchangeable.

## 11. API Design

Use REST APIs with JSON request and response bodies.

Suggested endpoints:

### Materials
- GET `/api/materials`
- GET `/api/materials/:id`
- POST `/api/materials`
- PUT `/api/materials/:id`
- DELETE `/api/materials/:id`

### Matching
- GET `/api/matches`
- POST `/api/matches/search`

### Exchange Requests
- GET `/api/exchange-requests`
- GET `/api/exchange-requests/:id`
- POST `/api/exchange-requests`
- PATCH `/api/exchange-requests/:id/status`

### Company
- GET `/api/companies/me`
- PUT `/api/companies/me`

### Dashboard
- GET `/api/dashboard/stats`

These are proposed routes, not a statement that all endpoints already exist. Inspect the backend before implementing or changing them. Keep route names, validation, response formats, and authorization rules consistent.

## 12. Security Requirements

- Never commit `.env` files or credentials.
- Never expose database passwords or Supabase service-role/secret keys to the browser.
- Use the Supabase publishable key only where appropriate in frontend configuration.
- Verify Supabase Auth tokens in protected backend routes.
- Validate all request bodies and parameters.
- Apply Row Level Security policies to protected database tables.
- Enforce company ownership and permissions on the server and database.
- Do not rely only on hiding frontend buttons to enforce authorization.
- Use safe error responses that do not expose secrets or database internals.

## 13. User Interface Requirements

The application should use a professional industrial sustainability design.

Preferred design:
- Dark forest green and emerald green accents.
- White and light-grey backgrounds.
- Clean navigation sidebar and top navbar.
- Responsive cards, tables, and charts.
- Consistent spacing and typography.
- Accessible form controls and readable error messages.
- Loading indicators, empty states, and error handling.
- Responsive layouts for desktop, tablet, and mobile.

Avoid unnecessary animations, excessive decoration, and duplicated components.

## 14. Team Development and Git Workflow

The team uses separate Git branches:
- `main` — stable, integrated application.
- `Front-end` — React frontend work.
- `Back-End` — Node.js and Express backend work.
- `DataBase` — PostgreSQL schema, policies, and database work.

Team members should:
1. Work on their assigned branch.
2. Commit changes with meaningful messages.
3. Push to their assigned branch.
4. Open a pull request into `main`.
5. Review and test changes before merging.

Coordinate API contracts, database schema, environment variables, and file ownership before implementing dependent features.

Avoid changing shared files unnecessarily. Keep `main` in a working state.

## 15. Development Priorities

Implement the project incrementally.

### Phase 1: Foundation
- Inspect the existing repository.
- Confirm the frontend and backend startup commands.
- Establish environment configuration.
- Create the PostgreSQL schema and access policies.

### Phase 2: Core Features
- Authentication and company profiles.
- Material listing CRUD operations.
- Material search and filtering.
- Basic material matching.
- Exchange request management.

### Phase 3: Dashboard
- Dashboard statistics.
- Matching recommendations.
- Exchange activity.
- Environmental impact estimates.

### Phase 4: Integration and Testing
- Connect React to the Express APIs.
- Test authentication and authorization.
- Test database operations.
- Test matching logic and request status transitions.
- Verify responsive design and error handling.

### Phase 5: Optional Enhancements
- Transportation cost estimator.
- Material image uploads.
- CSV reports.
- Advanced AI/ML matching.
- More detailed environmental analytics.

## 16. Instructions for AI Coding Assistants

When working on this repository:

1. Read this README before generating or modifying code.
2. Inspect the actual directory structure, package files, existing routes, database schema, and current implementation.
3. Do not assume that proposed files, APIs, or database tables already exist.
4. Preserve working code and the current Create React App setup.
5. Use JavaScript, not TypeScript, unless the project requirements explicitly change.
6. Use React for the frontend and Node.js/Express for the backend.
7. Use Supabase PostgreSQL and Supabase Auth for database and authentication features.
8. Keep frontend components, API clients, backend routes, business logic, and database configuration separate.
9. Reuse existing components and dependencies wherever possible.
10. Do not create duplicate files or duplicate API endpoints.
11. Never invent credentials, real company partnerships, live material listings, or verified environmental savings.
12. Use clearly labeled sample data only when the backend is not configured.
13. Never claim an operation succeeded unless it actually succeeded.
14. Implement validation, error handling, loading states, and authorization for new features.
15. Never expose secrets or commit `.env` files.
16. Make small, coherent changes and test each feature before continuing.
17. Report which files were changed, what was implemented, and how to test it.
18. Ask for clarification when a major architectural decision cannot be determined from the repository or this README.

## 17. Project Scope and Limitations

This is a prototype intended to demonstrate industrial material discovery, matching, and exchange workflows.

The initial implementation does not guarantee:
- Actual industrial partnerships.
- Real-time transport prices.
- Legally approved waste transfers.
- Laboratory-verified material compatibility.
- Scientifically validated environmental savings.
- A trained AI model unless one is separately developed and integrated.

Industrial waste exchanges must comply with applicable environmental, transportation, and safety requirements. Hazardous or regulated materials require additional verification and must not be treated as automatically suitable for exchange.

## 18. Expected Outcome

At the end of the mini project, the team aims to deliver a working web application that allows companies to register, publish and search for reusable materials, view compatibility-based recommendations, manage exchange requests, and view basic dashboard and environmental statistics.

The prototype will demonstrate how digital matching and centralized information can support more efficient industrial resource utilization and circular economy practices.
