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
│   └── schema.sql                  # Production MySQL 8.4 DDL script (11 normalized tables)
├── docs/                           # Architecture & MCA Academic Documentation
│   ├── PROJECT_PLAN.md             # Project requirements, scope & RTM
│   ├── ARCHITECTURE.md             # Layered MVC, routing catalog & sequence diagrams
│   ├── DATABASE_DESIGN.md          # 3NF normalization analysis & schema specs
│   ├── ER_DIAGRAM.md               # Mermaid ER diagram & relational integrity rules
│   └── DEVELOPMENT_ROADMAP.md      # 7-Phase milestone roadmap & acceptance gates
├── src/
│   ├── config/                     # Configuration modules
│   │   ├── env.js                  # Centralized dotenv validation
│   │   └── database.js             # MySQL connection pool setup & health check
│   ├── controllers/                # MVC Controller layer (HTTP orchestration)
│   │   └── homeController.js       # Homepage verification & health check logic
│   ├── middleware/                 # Custom Express middlewares
│   │   └── errorHandler.js         # Centralized 404 & 500 error handlers
│   ├── routes/                     # Modular route declarations
│   │   └── homeRoutes.js           # Home (/) and health (/health) routes
│   ├── services/                   # Business domain services (prepared for Phase 3+)
│   ├── views/                      # EJS view templates
│   │   ├── partials/
│   │   │   ├── header.ejs          # HTML head, Bootstrap 5 & Google Fonts
│   │   │   ├── navbar.ejs          # Top navigation bar
│   │   │   └── footer.ejs          # Footer layout & Bootstrap scripts
│   │   ├── index.ejs               # Verification homepage
│   │   └── error.ejs               # Centralized error page (404/500)
│   ├── public/                     # Static files served directly
│   │   ├── css/
│   │   │   └── style.css           # Custom theme stylesheet
│   │   └── js/
│   │       └── main.js             # Client-side UI interactions
│   ├── app.js                      # Express application pipeline configuration
│   └── server.js                   # Application entry point & server listener
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
DB_NAME=hotel_management_db
DB_CONNECTION_LIMIT=10
```

> **Security Note:** `.env` is listed in `.gitignore` and must never be committed to source control.

---

## 🗄️ Database Configuration

Initialize the database schema using MySQL Workbench or the MySQL CLI:

```bash
mysql -u root -p < database/schema.sql
```

This creates the database `hotel_management_db` and all 11 normalized tables with indexes, foreign keys, and constraints.

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

Upon starting, the server logs:
```
======================================================================
🏨  Hotel Reservation & Management System
🚀  Server running in [DEVELOPMENT] mode
🌐  Local URL:   http://localhost:3000
🩺  Health API:  http://localhost:3000/health
======================================================================
✅  Database:   MySQL Database connected successfully.
======================================================================
```

---

## 🔍 Verification & Endpoints

| Endpoint | Method | Expected Output | Purpose |
| :--- | :---: | :--- | :--- |
| `http://localhost:3000/` | `GET` | HTML (Status 200) | Verification Homepage displaying Express, EJS, and Module Matrix. |
| `http://localhost:3000/health` | `GET` | JSON (Status 200) | API returning system uptime, environment, and DB pool connectivity. |
| `http://localhost:3000/non-existent-route` | `GET` | HTML (Status 404) | Verifies centralized 404 Not Found error handler. |

---

## 📚 Architecture & Documentation

Comprehensive architectural and engineering documentation is available in `docs/`:
- **[PROJECT_PLAN.md](docs/PROJECT_PLAN.md)**: Full requirements breakdown and RTM.
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Detailed MVC architecture, routing table, and security design.
- **[DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)**: 3NF normalization analysis, entity specifications, and indexes.
- **[ER_DIAGRAM.md](docs/ER_DIAGRAM.md)**: Complete Mermaid ER diagram and mathematical invariants.
- **[DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)**: Milestone plans and acceptance gates for all phases.

