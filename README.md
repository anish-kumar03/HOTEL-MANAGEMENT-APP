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
| **Server Framework** | Express.js 4.x |
| **Template Engine** | EJS (Embedded JavaScript) with partials |
| **Frontend Styling** | HTML5, CSS3, Bootstrap 5.3 (CDN), Bootstrap Icons |
| **Security & Logging** | Helmet (HTTP headers & CSP), Morgan (HTTP logger) |
| **Database & Driver** | MySQL 8.4 LTS via `mysql2/promise` connection pool |
| **Configuration** | Dotenv (zero hardcoded credentials) |

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
│   │   ├── homeController.js       # Homepage verification & health check logic
│   │   ├── customerController.js   # Customer management operations
│   │   ├── roomController.js       # Room inventory operations
│   │   ├── reservationController.js# Reservation & availability engine
│   │   └── billingController.js    # Payment settlements & billing invoices
│   ├── middleware/                 # Custom Express middlewares
│   │   └── errorHandler.js         # Centralized 404 & 500 error handlers
│   ├── routes/                     # Modular route declarations
│   │   ├── homeRoutes.js           # Home (/) and health (/health) routes
│   │   ├── customerRoutes.js       # Customer CRUD routes (/customers)
│   │   ├── roomRoutes.js           # Room inventory routes (/rooms)
│   │   ├── reservationRoutes.js    # Reservation routes (/reservations)
│   │   └── billingRoutes.js        # Payment & invoice routes (/payments)
│   ├── services/                   # Business domain services (Transactional logic)
│   │   ├── customerService.js      # Customer business logic & validations
│   │   ├── roomService.js          # Room classification & pricing logic
│   │   ├── reservationService.js   # Availability & SELECT FOR UPDATE transaction locking
│   │   └── billingService.js       # Billing calculations, partial settlements & receipts
│   ├── views/                      # EJS view templates
│   │   ├── partials/               # Reusable headers, footers, alerts & navbar
│   │   ├── customers/              # Customer management views
│   │   ├── rooms/                  # Room inventory views
│   │   ├── reservations/           # Booking & availability views
│   │   ├── payments/               # Payment directory, form, ledger & printable receipt
│   │   ├── billing/                # Itemized reservation invoice & folio
│   │   ├── index.ejs               # Verification homepage
│   │   └── error.ejs               # Centralized error page (404/500)
│   ├── public/                     # Static files served directly
│   │   ├── css/
│   │   │   └── style.css           # Custom theme stylesheet
│   │   └── js/
│   │       └── main.js             # Client-side UI interactions
│   ├── app.js                      # Express application pipeline configuration
│   └── server.js                   # Application entry point & server listener
├── test/
│   ├── crud-logic.test.js          # Node.js native test runner (42 automated unit & route tests)
│   └── e2e-db-crud.js              # Live MySQL end-to-end multi-module CRUD test runner
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
# Run automated unit and route test suite (42 tests)
npm test

# Run live MySQL database E2E CRUD & transactional verification
node test/e2e-db-crud.js
```

---

## 🔍 Verification & Endpoints

| Endpoint | Method | Expected Output | Purpose |
| :--- | :---: | :--- | :--- |
| `http://localhost:3000/` | `GET` | HTML (Status 200) | Verification Homepage displaying system status and module links. |
| `http://localhost:3000/health` | `GET` | JSON (Status 200) | Health-check endpoint testing MySQL connection pool via `SELECT 1;`. |
| `http://localhost:3000/customers` | `GET` | HTML (Status 200) | Customer directory with search and registration details. |
| `http://localhost:3000/rooms` | `GET` | HTML (Status 200) | Physical room inventory with category & status filters. |
| `http://localhost:3000/reservations` | `GET` | HTML (Status 200) | Reservation dashboard with status badges and actions. |
| `http://localhost:3000/reservations/new` | `GET` | HTML (Status 200) | Booking form with date availability validator and dynamic quote. |
| `http://localhost:3000/payments` | `GET` | HTML (Status 200) | Payment & billing overview with collection KPIs and search. |
| `http://localhost:3000/payments/new` | `GET` | HTML (Status 200) | Form to record partial/full payments with server bill reconciliation. |
| `http://localhost:3000/payments/history` | `GET` | HTML (Status 200) | Chronological payment audit ledger with method & status filters. |
| `http://localhost:3000/reservations/:id/invoice` | `GET` | HTML (Status 200) | Itemized reservation folio with room charges & additional services. |
| `http://localhost:3000/payments/:id/receipt` | `GET` | HTML (Status 200) | Printable official payment receipt with `@media print` layout. |

---

## 📚 Architecture & Documentation

Comprehensive architectural and engineering documentation is available in `docs/`:
- **[PROJECT_PLAN.md](docs/PROJECT_PLAN.md)**: Full requirements breakdown and RTM.
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Detailed MVC architecture, routing table, and security design.
- **[DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)**: 3NF normalization analysis, entity specifications, and indexes.
- **[ER_DIAGRAM.md](docs/ER_DIAGRAM.md)**: Complete Mermaid ER diagram and mathematical invariants.
- **[DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)**: Milestone plans and acceptance gates for all phases.

