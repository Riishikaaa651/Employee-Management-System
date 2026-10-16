# Employee Management System

A full-stack web application that lets an administrator manage employee records: create, view, edit and delete employees, search by name or email, filter by department and employment status, and page through results. 

---

## Contents
1. [Features](#1-features)
2. [Technology stack](#2-technology-stack)
3. [Architecture and folder structure](#3-architecture-and-folder-structure)
4. [Prerequisites](#4-prerequisites)
5. [Database setup (MySQL)](#5-database-setup-mysql)
6. [Environment variables](#6-environment-variables)
7. [Run the backend](#7-run-the-backend)
8. [Run the frontend](#8-run-the-frontend)
9. [Logging in (administrator account)](#9-logging-in-administrator-account)
10. [REST API and Swagger UI](#10-rest-api-and-swagger-ui)
11. [Backend tests](#11-backend-tests)
12. [Frontend tests](#12-frontend-tests)
13. [Postman collection](#13-postman-collection)
14. [Screenshots and demo checklist](#14-screenshots-and-demo-checklist)
15. [Troubleshooting](#15-troubleshooting)
16. [Design decisions and known limitations](#16-design-decisions-and-known-limitations)

---

## 1. Features

**Employee management (mandatory scope)**

- Employee record with Employee ID, Full Name, Email, Phone Number, Department, Designation, Date of Joining, Salary and Employment Status (Active/Inactive).
- Add, view, edit and delete employees. Deletion always asks for confirmation.
- List all employees with **server-side pagination** (10/20/50 rows per page) and sortable columns.
- **Search** by name or email (case-insensitive, debounced while typing).
- **Filter** by department and by employment status. Search and filters can be combined.
- Responsive UI: the table becomes stacked cards on phones.
- Loading, empty, error and success states throughout. List filters live in the URL, so refreshing or sharing a link keeps them.
- Validation on both sides. The browser gives instant field-level feedback, and the server enforces the same rules authoritatively: required fields, email format, phone format, non-negative salary with at most 2 decimals, joining date not in the future, maximum lengths, and unique email.

**Optional enhancements implemented**

- **Login and basic authentication.** Session-based login with Spring Security, BCrypt-hashed passwords, a login page, protected routes and APIs, logout, session-expiry handling and CSRF protection.
- **Automated frontend tests.** 39 Vitest and React Testing Library tests covering the list, search, filters, pagination, forms, create/edit/delete, error handling, login, protected routes, logout and session expiry.

Not included (intentionally out of scope): department management, CSV export, Docker Compose.

## 2. Technology stack

| Layer | Technology |
| --- | --- |
| Backend | Java 25 (LTS), Spring Boot 3.5, Spring Web, Spring Data JPA (Hibernate), Bean Validation, Spring Security, Maven (wrapper included) |
| Database | MySQL 8.x. Schema managed by **Flyway** migrations. |
| API docs | springdoc-openapi (Swagger UI) |
| Backend tests | JUnit 5, Mockito, AssertJ, Spring MockMvc, H2 (in-memory, MySQL mode) for integration tests |
| Frontend | React 19, TypeScript (strict), Vite 7, React Router 7, Axios, plain CSS |
| Frontend tests | Vitest, React Testing Library, user-event, jsdom |

## 3. Architecture and folder structure

```
Employee_Management_System/
├── backend/                        Spring Boot REST API
│   ├── mvnw, mvnw.cmd, pom.xml     Maven wrapper: no local Maven install needed
│   └── src/
│       ├── main/java/com/kloudspot/ems/
│       │   ├── employee/           Controller, service, repository, entity, specifications, DTOs, demo data
│       │   ├── security/           SecurityConfig, user entity/repository, admin initializer, auth endpoints
│       │   ├── common/             Error response, exceptions, global exception handler, paged response
│       │   └── config/             OpenAPI, typed app properties, clock
│       ├── main/resources/
│       │   ├── application.properties
│       │   └── db/migration/       Flyway SQL migrations (V1 employees, V2 app_users)
│       └── test/                   Unit tests, MockMvc integration tests, optional H2 preview runner
├── frontend/                       React + TypeScript single-page app
│   └── src/
│       ├── api/                    Axios client (session cookie + CSRF), typed API modules, error mapping
│       ├── components/             Alert, ConfirmDialog, Pagination, StatusBadge, LoadingIndicator
│       ├── features/authentication Login page, AuthContext, ProtectedRoute
│       ├── features/employees/     List, details, create, edit pages, form and validation
│       ├── layouts/                App shell (header, navigation, logout)
│       ├── routes/                 Route table
│       ├── types/, utils/          Shared types, formatting helpers
│       └── tests/                  Vitest + React Testing Library tests
├── database/setup.sql              Creates the database and a least-privilege MySQL user
├── postman/                        Postman collection (21 requests with assertions)
├── screenshots/                    Screenshots of the running application
├── .env.example                    Template for local configuration (copy to .env)
└── README.md
```

**Backend layers.** `EmployeeController` handles HTTP only: parameters, status codes and the `Location` header. `EmployeeService` holds the business rules: email normalisation and uniqueness, the joining-date rule, sort-field whitelisting and page-size bounds. `EmployeeRepository` (Spring Data JPA) does persistence, and `EmployeeSpecifications` builds the dynamic search/filter query with bound parameters. Entities are never returned directly; the API uses the `EmployeeRequest` and `EmployeeResponse` DTOs. `GlobalExceptionHandler` turns every failure into the same JSON error shape.

**Request flow in development.** The browser talks only to the Vite dev server (`localhost:5173`), which proxies `/api/*` to Spring Boot (`localhost:8080`). The browser therefore sees a single origin, and the session and CSRF cookies work without any cross-site relaxations.

## 4. Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| JDK | 25 (LTS) | `java -version` |
| Node.js | 20.19+ or 22.12+ (tested with 24 LTS) | `node -v` |
| npm | 10+ | `npm -v` |
| MySQL Server | 8.0 or newer | `mysql --version` |

Maven does **not** need to be installed: use the included wrapper (`mvnw` / `mvnw.cmd`). It downloads Maven 3.9 on first use.

## 5. Database setup (MySQL)

Choose **one** option.

**Option A: dedicated application user (recommended).**

1. Open [`database/setup.sql`](database/setup.sql) and replace `CHANGE_ME_STRONG_PASSWORD` with a password of your choice.
2. Run it as a MySQL administrator:
   ```bash
   mysql -u root -p < database/setup.sql
   ```
   This creates the `employee_management` database and an `ems_app` user with rights only on that database.

**Option B: use an existing MySQL user (for example root).** Skip the script. The JDBC URL includes `createDatabaseIfNotExist=true`, so the database is created on first start if the user has the `CREATE` privilege.

**Tables are created automatically.** On startup, Flyway runs the versioned migrations in `backend/src/main/resources/db/migration`:

- `V1__create_employees_table.sql`: the `employees` table with `BIGINT` auto-increment ID, `DATE` joining date, `DECIMAL(12,2)` salary, a **unique index on email**, CHECK constraints (salary ≥ 0, status ∈ ACTIVE/INACTIVE) and indexes on department, status and name.
- `V2__create_app_users_table.sql`: login accounts (username unique, BCrypt hash, role).

Hibernate is set to `ddl-auto=none`. It never creates, alters or drops tables, and startup never deletes existing data.

## 6. Environment variables

Copy the template and edit it:

```bash
# from the repository root
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DB_HOST` | no | `localhost` | MySQL host |
| `DB_PORT` | no | `3306` | MySQL port |
| `DB_NAME` | no | `employee_management` | Database name |
| `DB_USERNAME` | **yes** | none | MySQL user (e.g. `ems_app`) |
| `DB_PASSWORD` | **yes** | none | MySQL password |
| `ADMIN_USERNAME` | yes, first run | none | Administrator login created at startup |
| `ADMIN_PASSWORD` | yes, first run | none | Administrator password (min. 8 chars, stored as BCrypt hash) |
| `SEED_DEMO_DATA` | no | `false` | `true` inserts 24 sample employees when the table is empty |
| `FRONTEND_ORIGIN` | no | `http://localhost:5173` | Origin allowed by CORS for direct (non-proxied) calls |
| `SERVER_PORT` | no | `8080` | Backend port |

The backend reads `.env` from the repository root (or from `backend/`) automatically through `spring.config.import`, so no shell `export` is needed. Real environment variables take precedence over the file. **`.env` is git-ignored; never commit it.** Write values without quotes.

## 7. Run the backend

```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

Wait for `Started EmployeeManagementApplication`. On first start you should also see `Created administrator account 'admin'` and, with `SEED_DEMO_DATA=true`, `Inserted 24 demo employees`.

- API base URL: `http://localhost:8080/api`
- Swagger UI: <http://localhost:8080/swagger-ui.html>

To build a runnable jar instead: `./mvnw clean package`, then `java -jar target/employee-management-backend-1.0.0.jar` (run it from the repository root or `backend/` so `.env` is found).

## 8. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` to `http://localhost:8080`. If your backend runs elsewhere, start the dev server with `BACKEND_URL=http://host:port npm run dev`.

Production build: `npm run build` creates `frontend/dist/`. `npm run preview` serves that build on <http://localhost:4173> with the same `/api` proxy.

## 9. Logging in (administrator account)

There are no hard-coded credentials. The administrator account is created from **your** configuration:

1. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` before the first backend start.
2. On startup, `AdminAccountInitializer` creates that user with a **BCrypt-hashed** password if the username does not exist yet.
3. Log in at <http://localhost:5173/login> with those credentials.

An existing account is never modified, so restarting cannot silently reset a password. To reset the password, delete the user row and restart (`DELETE FROM app_users WHERE username = 'admin';`), or set a different `ADMIN_USERNAME`.

**How authentication works**

- `POST /api/auth/login` (form fields `username`, `password`) creates a server-side HTTP session (`JSESSIONID`, HttpOnly, SameSite=Lax, 30-minute idle timeout). The session ID is rotated on login to prevent session fixation.
- Every `/api/employees/**` endpoint requires the `ADMIN` role. Unauthenticated requests get `401` JSON; never a redirect or HTML page.
- **CSRF protection stays enabled.** The server issues an `XSRF-TOKEN` cookie, and the frontend echoes it in the `X-XSRF-TOKEN` header on POST/PUT/DELETE.
- `POST /api/auth/logout` invalidates the session. If any API call returns 401 later (expired session), the UI returns to the login page with a "session expired" message.

## 10. REST API and Swagger UI

Interactive documentation: **<http://localhost:8080/swagger-ui.html>**. To use "Try it out" on protected endpoints, first log in through the frontend or call `POST /api/auth/login` in Swagger. Swagger UI sends the CSRF header automatically.

| Method | Endpoint | Description | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Log in (form: `username`, `password`) | 200 | 401, 403 (CSRF) |
| POST | `/api/auth/logout` | Log out | 204 | 403 (CSRF) |
| GET | `/api/auth/me` | Current user | 200 | 401 |
| GET | `/api/auth/csrf` | Issue the XSRF-TOKEN cookie | 204 | none |
| GET | `/api/employees` | Paged list with search/filter/sort | 200 | 400, 401 |
| GET | `/api/employees/departments` | Distinct departments (for the filter) | 200 | 401 |
| GET | `/api/employees/{id}` | Employee details | 200 | 400, 401, 404 |
| POST | `/api/employees` | Create employee | 201 + `Location` | 400, 401, 403, 409 |
| PUT | `/api/employees/{id}` | Replace all employee fields | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/employees/{id}` | Delete employee | 204 | 401, 403, 404 |

**List query parameters** (all optional):

| Parameter | Default | Notes |
| --- | --- | --- |
| `page` | `0` | Zero-based page index |
| `size` | `10` | 1–100 |
| `search` | none | Case-insensitive match on full name **or** email |
| `department` | none | Exact department name (case-insensitive) |
| `status` | none | `ACTIVE` or `INACTIVE` |
| `sortBy` | `id` | `id`, `fullName`, `email`, `department`, `designation`, `dateOfJoining`, `salary`, `employmentStatus` |
| `sortDirection` | `asc` | `asc` or `desc` |

Example: `GET /api/employees?search=sha&department=Engineering&status=ACTIVE&page=0&size=10&sortBy=fullName&sortDirection=asc`

**Request body** (POST and PUT):

```json
{
  "fullName": "Priya Sharma",
  "email": "priya.sharma@example.com",
  "phoneNumber": "+91 98765 43210",
  "department": "Engineering",
  "designation": "Software Engineer",
  "dateOfJoining": "2024-07-01",
  "salary": 850000.00,
  "employmentStatus": "ACTIVE"
}
```

**Paged response:** `{ "content": [...], "page": 0, "size": 10, "totalElements": 24, "totalPages": 3, "first": true, "last": false }`

**Error response** (same shape for every error):

```json
{
  "timestamp": "2026-10-15T16:14:01.802Z",
  "status": 409,
  "error": "Conflict",
  "message": "An employee with this email address already exists",
  "path": "/api/employees",
  "fieldErrors": { "email": "An employee with this email address already exists" }
}
```

## 11. Backend tests

```bash
cd backend
./mvnw test                     # Windows: mvnw.cmd test
```

There are **44 tests**. They do not need MySQL.

- `EmployeeServiceTest`: JUnit 5 and Mockito unit tests of the service-layer business logic. They cover create (trimming, email normalisation), duplicate email (pre-check **and** the database unique-constraint race), get / not found, update (including keeping the same email and rejecting another employee's email), delete / not found, the future-joining-date rule, pagination bounds, the sort whitelist (including injection-style input), and LIKE-wildcard escaping.
- `AdminAccountInitializerTest`: the BCrypt hash is stored, existing accounts are never overwritten, and short passwords are refused.
- `EmployeeApiIntegrationTest`: the full HTTP stack through MockMvc, against the real Flyway schema in H2 (MySQL mode) with Hibernate `validate`. It covers 401/403/404/409/400 responses, the full CRUD lifecycle, combined search + filters + pagination, logout and the OpenAPI document.
- `CsrfCookieFlowIntegrationTest`: the real cookie-to-header CSRF flow the browser uses, including token rotation on login and rejection of a forged token.

## 12. Frontend tests

```bash
cd frontend
npm test                        # run once
npm run test:watch              # watch mode
npm run test:coverage           # coverage report in frontend/coverage/
npm run typecheck               # strict TypeScript check
```

There are **39 tests** across 5 files. API modules are mocked, so no backend or database is needed.

| File | Covers |
| --- | --- |
| `EmployeeListPage.test.tsx` | Rendering, loading/empty/no-match states, debounced search, combined filters, clear filters, pagination, sorting, delete confirmation (cancel, Escape, confirm), load and delete error handling |
| `EmployeeForm.test.tsx` | Required fields, email/phone/salary/date validation, error clearing, payload normalisation, server field errors, edge cases (leap day, max length) |
| `EmployeePages.test.tsx` | Successful create, duplicate-email (409) handling, edit pre-fill and full-payload update, not-found pages, details page fields, delete from details |
| `Authentication.test.tsx` | Protected-route redirect, session restore, login validation, failed login, redirect back after login, logout (including when the server is unreachable), session expiry |
| `httpClient.test.ts` | 401 triggering session expiry, no false expiry on login/me, CSRF retry, API error mapping |

## 13. Postman collection

File: [`postman/employee-management.postman_collection.json`](postman/employee-management.postman_collection.json) (21 requests, 38 assertions).

1. In Postman: **Import**, then select the file.
2. Open the collection, then **Variables**: set `password` (and `username` if not `admin`) to the values from your `.env`. `baseUrl` defaults to `http://localhost:8080`.
3. Run it with the **Collection Runner** in order. The folders are:
   1. *Authentication*: CSRF token, failed login (401), login, current user.
   2. *Employee CRUD, search and pagination*: list, search, filter, paginate + sort, departments, create, get, update.
   3. *Errors, delete and logout*: duplicate email (409), validation (400), invalid sort (400), page size out of range (400), missing CSRF (403), delete (204), get deleted (404), logout, list after logout (401).

The CSRF token is handled automatically: a collection-level script copies the `XSRF-TOKEN` cookie into the `xsrfToken` variable. From the command line: `npx newman run postman/employee-management.postman_collection.json --env-var "password=<your admin password>"`.

## 14. Screenshots and demo checklist

These are real screenshots of the running application, captured with headless Chrome. They are in [`screenshots/`](screenshots/):

| | |
| --- | --- |
| `01-login-error.png`: login with a rejected password | `02-employee-list.png`: employee list |
| `03-filtered-list.png`: department + status filters | `04-add-employee-validation.png`: client-side validation |
| `05-employee-details.png`: details after creating | `06-duplicate-email.png`: server 409 shown on the email field |
| `07-edit-employee.png`: pre-filled edit form | `08-delete-confirmation.png`: confirmation dialog |
| `09-mobile-list.png`: responsive layout at 390 px | `10-swagger-ui.png`: API documentation |

**Demo checklist** (with `SEED_DEMO_DATA=true`):

1. Open <http://localhost:5173/employees> while logged out. You are redirected to the login page.
2. Log in with a wrong password (error shown), then with the configured credentials.
3. List: 24 employees across 3 pages. Click **Next** and the page numbers, then change **Rows per page**.
4. Type `sharma` in Search: the results narrow after a short pause. Click **Clear filters**.
5. Choose Department = *Engineering* and Status = *Active*: both filters apply together.
6. Click a column header to sort; click again to reverse.
7. **Add employee**: submit empty to see validation. Fill in valid data and save; the details page shows a success message.
8. Try adding another employee with the same email in different letter case. A 409 error appears on the email field.
9. **Edit** the new employee, change the designation and status, and save.
10. Refresh the browser (F5). You are still logged in, and the changes persisted in MySQL.
11. **Delete**: a confirmation dialog appears. Cancel keeps the record; confirming removes it.
12. **Log out**: protected pages redirect to login again.
13. Open Swagger UI at <http://localhost:8080/swagger-ui.html>.

## 15. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Could not resolve placeholder 'DB_USERNAME'` | `.env` is missing or not in the repository root or `backend/`. Copy `.env.example` to `.env`. |
| `Access denied for user ...` | Wrong `DB_USERNAME`/`DB_PASSWORD`, or `database/setup.sql` was not run with the same password. |
| `Unknown database 'employee_management'` | The user lacks the CREATE privilege; run `database/setup.sql` first. |
| `Communications link failure` | MySQL is not running, or `DB_HOST`/`DB_PORT` is wrong (MySQL Installer may use 3306 or 3307). |
| Login always fails | The admin is only created when the username does not exist. If you changed `ADMIN_PASSWORD` after the first run, see [section 9](#9-logging-in-administrator-account) to reset. |
| `ADMIN_PASSWORD must be at least 8 characters` | Use a longer password. |
| Backend log warns that no user accounts exist | Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` and restart. |
| Frontend shows "Unable to reach the server" | The backend is not running on port 8080, or set `BACKEND_URL` for `npm run dev`. |
| `Port 5173 is in use` / `Port 8080 was already in use` | Stop the other process, or change `SERVER_PORT` (and `BACKEND_URL` for the frontend). |
| 403 "Missing or invalid CSRF token" in Postman/curl | Call `GET /api/auth/csrf` first and send the `XSRF-TOKEN` cookie value as the `X-XSRF-TOKEN` header. |
| `mvnw: Permission denied` (macOS/Linux) | `chmod +x backend/mvnw` |

**Quick preview without MySQL (optional).** To look at the app without configuring MySQL, start the backend on an in-memory H2 database (data is lost when it stops). Admin credentials are still required:

```bash
cd backend
# macOS/Linux
ADMIN_USERNAME=admin ADMIN_PASSWORD='choose-a-password' ./mvnw spring-boot:test-run -Dspring-boot.test-run.main-class=com.kloudspot.ems.LocalPreviewApplication
# Windows PowerShell
$env:ADMIN_USERNAME='admin'; $env:ADMIN_PASSWORD='choose-a-password'; .\mvnw.cmd spring-boot:test-run "-Dspring-boot.test-run.main-class=com.kloudspot.ems.LocalPreviewApplication"
```

## 16. Design decisions and known limitations

**Decisions**

- **Session cookies + CSRF instead of JWT.** The SPA and API share an origin in development, so an HttpOnly session cookie is simpler and safer than storing tokens in JavaScript, and CSRF protection stays on.
- **Flyway owns the schema.** Changes are versioned and repeatable, and Hibernate never alters tables.
- **Database-level guarantees.** Email uniqueness is enforced by a unique index, not just a pre-check. A concurrent duplicate still returns a clean 409 rather than a 500.
- **Whitelisted sorting and bounded page size.** Arbitrary `sortBy` values never reach the query, and `size` is capped at 100.
- **Search input escaping.** `%` and `_` typed by a user are matched literally.
- **Employee ID** is the auto-increment primary key, shown as `#<id>`.
- **Salary** is annual, stored as `DECIMAL(12,2)` and shown in INR.
- **PUT is a full replacement.** The edit form always sends every field, pre-filled from the stored record, so unchanged values are preserved.

**Known limitations**

- Single role (`ADMIN`). There is no user management UI, self-registration or password reset flow (out of scope).
- No login rate limiting or account lockout.
- Backend integration tests use H2 in MySQL compatibility mode rather than a real MySQL instance (no Testcontainers). The MySQL-specific path (driver, Flyway migrations on MySQL) is exercised when you run the application.
- The session store is in-memory: sessions are lost when the backend restarts, and the app runs as a single instance only.
- Development setup only. A production deployment would add HTTPS (and `Secure` cookies), a reverse proxy serving `frontend/dist`, externalised secrets and monitoring.
