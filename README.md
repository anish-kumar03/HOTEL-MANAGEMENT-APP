# Hotel Reservation & Management System (HRMS)

> A modern, academic-level Master of Computer Applications (MCA) web application engineered with **Node.js**, **Express.js**, **EJS**, and **MySQL 8.4 LTS**, following the Layered Model-View-Controller (MVC) architectural pattern.

---

## 📋 Table of Contents
- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [Folder Structure](#-folder-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Database Configuration](#-database-configuration)
- [Running the Application](#-running-the-application)
- [Verification & Endpoints](#-verification--endpoints)
- [Architecture & Documentation](#-architecture--documentation)

---

## 🏨 Project Overview

The **Hotel Reservation & Management System (HRMS)** is an integrated management solution designed to handle:
1. Administrator Dashboard & Real-time KPIs
2. Customer / Guest Profile Management
3. Room Classifications & Physical Room Inventory
4. Room Availability Engine (with zero double-booking algorithm)
5. Reservation Booking Lifecycle
6. Front-Desk Check-In & Check-Out Management
7. Payment Tracking (Cash, Card, UPI, Net Banking)
8. Itemized Billing & Print-ready Invoicing
9. Reservation Reporting & Analytics
10. Revenue & Occupancy Reports

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Language** | Node.js (v20+ LTS / v24+), JavaScript (ES Modules) |
| **Server Framework** | Express.js 4.x / 5.x |
| **Template Engine** | EJS (Embedded JavaScript) with reusable component partials |
| **Frontend Styling** | HTML5, CSS3, Bootstrap 5.3 (CDN), Bootstrap Icons 1.11, Google Fonts (Plus Jakarta Sans & Inter) |
| **Visualization & Charts** | Chart.js 4.4 (Monthly Revenue, Category Distribution, Monthly Bookings) |
| **Security & Logging** | Bcrypt (password hashing, 10 salt rounds), Express-Session, Helmet (CSP & HTTP headers), Morgan (HTTP logger) |
| **Authentication & AuthZ** | Session-based authentication, `requireAuth` route guards, secure cookies (`HttpOnly`, `SameSite=Lax`) |
| **Database & Driver** | MySQL 8.4 LTS via `mysql2/promise` connection pool |
| **Configuration** | Dotenv (zero hardcoded credentials) |

---

## 🔒 Phase 9: Administrator Authentication & Security Architecture

The application includes enterprise-grade session authentication and route protection:
- **`admin_users` Table:** Stores administrator identity (`admin_id`, `username`, `email`, `password_hash`, `created_at`). Plain-text passwords are never stored.
- **Bcrypt Password Hashing:** Passwords are encrypted with 10 salt rounds before persistence or comparison.
- **Session Management (`express-session`):** Authenticated state is managed via secure, signed server-side sessions with a 24-hour lifetime.
- **Hardened Cookie Protection:** Session cookies are configured with `HttpOnly: true` (XSS mitigation), `SameSite: 'lax'` (CSRF mitigation), and conditional `Secure` flags for production HTTPS.
- **Centralized Route Guards (`requireAuth`):** Every core administrative view (`/`, `/customers/*`, `/rooms/*`, `/reservations/*`, `/payments/*`, `/reports/*`) enforces an active session. Unauthenticated HTML requests are safely redirected to `/login?error=unauthorized` while API requests receive `HTTP 401 Unauthorized` JSON.
- **Administrator Setup Script:** Includes `npm run seed:admin` (`database/seed-admin.js`) to generate initial administrative accounts from environment variables without exposing plain text in source control.
- **Default Academic Credentials:**
  - **Username / Email:** `admin` or `admin@grandhorizon.com`
  - **Password:** `Admin@12345`

---

## 🎨 Phase 8: Premium Administrative Design System

The application features a complete redesign engineered for luxury hospitality administration:
- **Fixed Sidebar Navigation (`265px`):** Brand identity, Core Operations (Dashboard, Customers, Rooms, Reservations, Payments), Analytics & Reports Portal, System Health API, and Admin profile session pill.
- **Responsive Top Navigation Bar (`70px`):** Mobile offcanvas drawer trigger, breadcrumb tracking, live system clock (`#topbarClock`), quick action buttons, and operator account dropdown.
- **Executive Statistic Cards (`.stat-widget`):** High-contrast KPI widgets featuring colored iconography, accent pill indicators, and typography optimized for executive monitoring.
- **Dual View Modes for Rooms:** Seamlessly toggle between **Visual Room Cards Grid** (showing capacity, pricing badges, and operational status) and **Structured Data Table**.
- **Responsive Offcanvas Drawer:** Full mobile usability with slide-in navigation, glassmorphism backdrop blur (`#sidebarBackdrop`), and auto-closing triggers.
- **Interactive Enhancements:** Double-submit prevention on financial and booking forms with inline spinners, auto-dismissing flash alerts (6 seconds), and Bootstrap tooltips.
- **Clean Print Stylesheet (`@media print`):** Dedicated printable invoice folios and settlement receipts with automatic header/nav masking.

---

## 📁 Folder Structure

```
HOTEL MANAGEMENT APP/
├── database/                       # Database DDL migration and seed scripts
│   ├── schema.sql                  # Production MySQL 8.4 DDL script (tables & constraints)
│   └── seed.sql                    # Realistic sample data (customers, rooms, bookings, payments)
├── docs/                           # Architecture & MCA Academic Documentation
│   ├── PROJECT_PLAN.md             # Project requirements, scope & RTM
│   ├── ARCHITECTURE.md             # Layered MVC, routing catalog & sequence diagrams
│   ├── DATABASE_DESIGN.md          # 3NF normalization analysis & schema specs
│   ├── ER_DIAGRAM.md               # Mermaid ER diagram & relational integrity rules
│   └── DEVELOPMENT_ROADMAP.md      # Milestone roadmap & acceptance gates
├── src/
│   ├── config/                     # Configuration modules
│   │   ├── env.js                  # Centralized dotenv validation
│   │   └── db.js                   # MySQL connection pool setup & health check
│   ├── controllers/                # MVC Controller layer (HTTP orchestration)
│   │   ├── dashboardController.js  # Executive dashboard telemetry & charts
│   │   ├── customerController.js   # Customer management operations
│   │   ├── roomController.js       # Room inventory operations
│   │   ├── reservationController.js# Reservation & availability engine
│   │   ├── billingController.js    # Payment settlements & billing invoices
│   │   ├── reportController.js     # 7 Modular analytical & operational reports
│   │   └── homeController.js       # System health check API & status
│   ├── middleware/                 # Custom Express middlewares
│   │   └── errorHandler.js         # Centralized 404 & 500 error handlers
│   ├── routes/                     # Modular route declarations
│   │   ├── dashboardRoutes.js      # Executive dashboard routes (/ and /dashboard)
│   │   ├── customerRoutes.js       # Customer CRUD routes (/customers)
│   │   ├── roomRoutes.js           # Room inventory routes (/rooms)
│   │   ├── reservationRoutes.js    # Reservation routes (/reservations)
│   │   ├── billingRoutes.js        # Payment & invoice routes (/payments)
│   │   ├── reportRoutes.js         # 7 Comprehensive report routes (/reports)
│   │   └── homeRoutes.js           # Health (/health) and status routes
│   ├── services/                   # Business domain services (Transactional logic)
│   │   ├── dashboardService.js     # 10 Real-time stats & Chart.js datasets
│   │   ├── customerService.js      # Customer business logic & validations
│   │   ├── roomService.js          # Room classification & pricing logic
│   │   ├── reservationService.js   # Availability & SELECT FOR UPDATE transaction locking
│   │   ├── billingService.js       # Billing calculations, partial settlements & receipts
│   │   └── reportService.js        # Aggregations, GROUP BY, and statistical queries
│   ├── views/                      # EJS view templates
│   │   ├── partials/               # Reusable headers, footers, alerts & navbar
│   │   ├── dashboard/              # Dynamic admin operations dashboard
│   │   ├── customers/              # Customer management views
│   │   ├── rooms/                  # Room inventory views
│   │   ├── reservations/           # Booking & availability views
│   │   ├── payments/               # Payment directory, form, ledger & printable receipt
│   │   ├── billing/                # Itemized reservation invoice & folio
│   │   ├── reports/                # 7 Executive report views & central portal
│   │   ├── index.ejs               # Foundation verification view
│   │   └── error.ejs               # Centralized error page (404/500)
│   ├── public/                     # Static files served directly
│   │   ├── css/
│   │   │   └── style.css           # Custom theme stylesheet
│   │   └── js/
│   │       └── main.js             # Client-side UI interactions
│   ├── app.js                      # Express application pipeline configuration
│   └── server.js                   # Application entry point & server listener
├── test/
│   ├── crud-logic.test.js          # Node.js native test runner (47 automated unit & route tests)
│   └── e2e-db-crud.js              # Live MySQL end-to-end 5-module CRUD test runner
├── .env.example                    # Environment variables template
├── .gitignore                      # Git exclusion rules
├── package.json                    # Project dependencies and npm scripts
└── README.md                       # Project documentation
```

---

## ⚙️ Prerequisites

Ensure your system has the following installed:
- **Node.js**: `v20.x` or higher (verified on `v24.x`)
- **npm**: `v10.x` or higher
- **MySQL Server**: `MySQL 8.4 LTS` (or compatible MySQL 8.0+)
- **MySQL Workbench** or MySQL CLI

---

## 🚀 Installation & Setup

### 1. Clone or Open Project
Navigate to the project root directory:
```bash
cd "d:/MY PROJECTS/HOTEL MANAGEMENT APP"
```

### 2. Install Dependencies
Dependencies are already configured in `package.json`:
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

Edit `.env` to supply your local MySQL database credentials:
```env
NODE_ENV=development
PORT=3000
APP_NAME="Hotel Reservation & Management System"
APP_URL=http://localhost:3000

SESSION_SECRET=your_super_secret_session_key

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hotel_reservation_db
DB_CONNECTION_LIMIT=10
```

> **Security Note:** `.env` is listed in `.gitignore` and must never be committed to source control.

---

## 🗄️ Database Configuration

Initialize the database schema and sample seed records using MySQL Workbench or the MySQL CLI:

```bash
# 1. Execute DDL Schema (creates tables, foreign keys, and indexes)
mysql -u root -p < database/schema.sql

# 2. Execute Sample Seed Data (10 customers, 15 rooms, bookings, payments, services)
mysql -u root -p < database/seed.sql
```

This creates and populates the database `hotel_reservation_db` with all relational tables, indexes, and InnoDB foreign key constraints.

---

## 🏃 Running the Application

### Development Mode (with auto-restart via nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running Test Suites
```bash
# Run automated unit, route, and authentication test suite (77 tests)
npm test

# Run live MySQL database E2E CRUD, transactional, reporting, and auth verification
node test/e2e-db-crud.js

# Initialize or reseed default administrator account in MySQL
npm run seed:admin
```

---

## 🔍 Verification & Endpoints

| Endpoint | Method | Expected Output | Purpose |
| :--- | :---: | :--- | :--- |
| `http://localhost:3000/login` | `GET` | HTML (Status 200) | Administrator Login portal with credentials input and password toggle. |
| `http://localhost:3000/login` | `POST` | Redirect / HTML | Authenticates credentials, sets session cookie (`hrms_session_id`), redirects to `/`. |
| `http://localhost:3000/logout` | `POST` | Redirect (302) | Destroys administrative session, clears session cookie, redirects to `/login`. |
| `http://localhost:3000/health` | `GET` | JSON (Status 200/503) | Public health-check endpoint testing MySQL connection pool via `SELECT 1;`. |
| `http://localhost:3000/` | `GET` | HTML (Status 200) | Protected Executive Admin Dashboard (requires session). |
| `http://localhost:3000/api/dashboard/stats` | `GET` | JSON (Status 200) | Protected telemetry endpoint returning real-time stats and Chart.js datasets. |
| `http://localhost:3000/customers` | `GET` | HTML (Status 200) | Protected customer directory with search and registration details. |
| `http://localhost:3000/rooms` | `GET` | HTML (Status 200) | Protected physical room inventory with category & status filters. |
| `http://localhost:3000/reservations` | `GET` | HTML (Status 200) | Protected reservation dashboard with status badges and actions. |
| `http://localhost:3000/reservations/new` | `GET` | HTML (Status 200) | Protected booking form with date availability validator and dynamic quote. |
| `http://localhost:3000/payments` | `GET` | HTML (Status 200) | Protected payment & billing overview with collection KPIs and search. |
| `http://localhost:3000/payments/new` | `GET` | HTML (Status 200) | Form to record partial/full payments with server bill reconciliation. |
| `http://localhost:3000/payments/history` | `GET` | HTML (Status 200) | Chronological payment audit ledger with method & status filters. |
| `http://localhost:3000/reservations/:id/invoice` | `GET` | HTML (Status 200) | Itemized reservation folio with room charges & additional services. |
| `http://localhost:3000/payments/:id/receipt` | `GET` | HTML (Status 200) | Printable official payment receipt with `@media print` layout. |
| `http://localhost:3000/reports` | `GET` | HTML (Status 200) | Central Reporting & Analytics Portal with catalog of 7 reports. |
| `http://localhost:3000/reports/daily-reservations` | `GET` | HTML (Status 200) | **Report 1:** Daily Reservation Report with date and status filters. |
| `http://localhost:3000/reports/monthly-reservations` | `GET` | HTML (Status 200) | **Report 2:** Monthly Reservation Report with ALOS & cancellation rates. |
| `http://localhost:3000/reports/customer-bookings` | `GET` | HTML (Status 200) | **Report 3:** Customer Booking Report with guest frequency & lifetime spend. |
| `http://localhost:3000/reports/room-availability` | `GET` | HTML (Status 200) | **Report 4:** Room Availability Report for target date inventory audit. |
| `http://localhost:3000/reports/monthly-revenue` | `GET` | HTML (Status 200) | **Report 5:** Monthly Revenue Report by payment channel (Cash, UPI, Card). |
| `http://localhost:3000/reports/payment-history` | `GET` | HTML (Status 200) | **Report 6:** Payment History Report with multi-criteria search and filter. |
| `http://localhost:3000/reports/cancelled-reservations` | `GET` | HTML (Status 200) | **Report 7:** Cancelled Reservation Report auditing lost tariff revenues. |

---

## 📚 Architecture & Documentation

Comprehensive architectural and engineering documentation is available in `docs/`:
- **[PROJECT_PLAN.md](docs/PROJECT_PLAN.md)**: Full requirements breakdown and RTM.
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Detailed MVC architecture, routing table, and security design.
- **[DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)**: 3NF normalization analysis, entity specifications, and indexes.
- **[ER_DIAGRAM.md](docs/ER_DIAGRAM.md)**: Complete Mermaid ER diagram and mathematical invariants.
- **[DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)**: Milestone plans and acceptance gates for all phases.

