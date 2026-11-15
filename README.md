# Greenfield Polytechnic – College Management System

Full-stack app (one server serves both the API and the built UI): **React + Vite + Tailwind + React Router + Axios** (client) and **Node + Express + MongoDB/Mongoose** (server) with JWT access/refresh tokens and server-enforced role-based access control (Admin / Teacher / Student).

## Run it

You need **Node 18+** and **MongoDB** (installed locally, or a free MongoDB Atlas cluster).

```bash
npm run setup      # 1. installs everything and builds the UI (once)
npm start          # 2. starts API + UI together
```

**Windows shortcut:** double-click **`start.bat`** (installs, checks your PC, starts the server and opens the browser). Mac/Linux: `./start.sh`.

Then open **http://localhost:5000** and log in with a demo account (click **Use →**).

- On the first start with an empty database the demo data is loaded automatically. To wipe and reload it later: `npm run seed`.
- No `.env` is needed for a local MongoDB (`mongodb://127.0.0.1:27017`). For Atlas or production, copy `server/.env.example` to `server/.env` and set `MONGO_URI` and the two JWT secrets.
- Developing the UI? Use `npm run dev` (API on :5000 and Vite on **http://localhost:5173**, with hot reload).
- If MongoDB isn't running the server stops after ~8 seconds and prints how to fix it.

### Demo accounts (created by the seed)

| Role    | Email                | Password   | Name            |
|---------|----------------------|------------|-----------------|
| Admin   | admin@college.com    | admin123   | Aisha Khan      |
| Teacher | teacher@college.com  | teacher123 | Sanjay Kulkarni |
| Student | student@college.com  | student123 | Aarav Sharma    |

The seed also creates 12 teachers (login `firstname.lastname@gpc.edu` / `teacher123`), 18 students (login = their student email, e.g. `priya.patel@student.gpc.edu` / `student123`), 8 courses, 16 attendance records (2026-08-01 to 08-14) and 14 results. Sanjay Kulkarni is assigned to C101 and B201.

## Troubleshooting: blank / white page

**First run `npm run doctor`.** It checks Node version, installed packages, the built UI, the port and whether MongoDB is reachable, and tells you how to fix each problem. If the page itself fails to start, a red banner at the top of the page now shows the error text.

1. **Never open `index.html` or `client/dist/index.html` by double-clicking.** The app must be served: run `npm start` and open **http://localhost:5000** (or `npm run dev` and open http://localhost:5173).
2. Use Node 18 or newer (`node -v`).
3. Still blank? Press `F12`, open the **Console** tab and read the red error. If the app itself crashes, an on-screen "Something went wrong" message shows the error text.
4. Cleared-looking login or stuck session? Run `localStorage.clear(); sessionStorage.clear()` in the console and reload.
5. Login says "Cannot reach the server"? The API is not running or MongoDB is down; check the terminal where you ran `npm start`.

## Project structure

```
client/src
  components/   ErrorBoundary, ProtectedRoute, RoleRoute, Sidebar, Topbar, DataTable, FormModal, Modal, ConfirmDialog, StatusBadge
  context/      AuthContext (user, permissions, can()), ToastContext
  hooks/        usePaginated, useDebounce, useAddParam
  layouts/      DashboardLayout
  pages/        Login, Dashboard, Students, Teachers, Courses, Attendance, Results, Roles, Permissions
  services/     api.js (Axios instance, token refresh interceptor, API helpers)
  utils/        format.js, navigation.js
server/src
  config/db.js
  controllers/  auth, student, teacher, course, attendance, result, dashboard, role
  middleware/   auth.js (JWT), roleCheck.js (authorize + permit), error.js
  models/       User, Student, Teacher, Course, Attendance, Result, ActivityLog, Permission
  routes/       one router per module (+ crud.js builder)
  utils/        permissions.js, scope.js, grade.js, pagination.js, validate.js, tokens.js, activity.js
server/seed.js
```

## How auth works

1. `POST /api/auth/login` returns `{ accessToken, refreshToken, user: { name, email, role } }` and also sets the refresh token as an `httpOnly` cookie.
2. The Axios request interceptor adds `Authorization: Bearer <accessToken>`.
3. On a `401`, the response interceptor calls `/api/auth/refresh` once (parallel requests share that call), stores the rotated tokens and replays the request. If the refresh fails the user is sent to `/login`.
4. "Remember me" keeps tokens in `localStorage`; otherwise they live in `sessionStorage`.
5. Refresh tokens are stored hashed (SHA-256) per user, rotated on every refresh and revoked on logout.
6. Passwords are hashed with `bcryptjs` (same algorithm/API as `bcrypt`, no native build step).

## RBAC

Every route goes through `protect` (valid JWT) and then `permit(module, action)` which reads the permission matrix from MongoDB. Row-level rules are enforced in the controllers:

| Role    | What the API allows by default |
|---------|--------------------------------|
| Admin   | Full CRUD on students, teachers, courses, attendance, results; Roles & Permissions; dashboard stats. Admin permissions can't be edited, so the admin can't lock themselves out. |
| Teacher | Read students and courses. Create/update attendance and results **only for students in their assigned courses** (checked on every write). No delete, no teachers page, no Roles/Permissions. |
| Student | Read **only their own** profile, course, attendance and results (queries are filtered server-side). No writes. |

The **Permissions** page edits the Teacher and Student columns (saved to the `permissions` collection and applied immediately). Some cells are locked on the server and shown disabled in the UI: the Admin column, the Roles row, and every non-Read action for Students. Roles/Permissions endpoints are additionally hard-coded to Admin only.

The sidebar and buttons are shown/hidden from the same matrix (`GET /api/auth/me` returns it), but that is a convenience; the API rejects anything the role isn't allowed to do with `403`.

## API

All routes are under `/api`. `Auth` = valid Bearer token. Modules are gated by the permission matrix (`module.action`).

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | `/auth/login` | public | `{ email, password }` |
| POST | `/auth/refresh` | refresh token (body or cookie) | rotates tokens |
| POST | `/auth/logout` | public | revokes the refresh token |
| GET | `/auth/me` | Auth | user + permission matrix |
| GET | `/dashboard` | Auth | stats, recent students, activity (scoped per role) |
| GET | `/dashboard/activity?limit=` | Auth | latest activity (bell menu) |
| GET | `/students` | students.read | `search, course, status, assigned=true, page, limit` · students see only themselves |
| GET | `/students/:id` | students.read | |
| POST | `/students` | students.create | also creates the login account |
| PUT | `/students/:id` | students.update | |
| DELETE | `/students/:id` | students.delete | cascades attendance, results, login |
| GET/POST/PUT/DELETE | `/teachers`, `/teachers/:id` | teachers.* | `search, status, page, limit`; body may include `courses: [ids]` |
| GET/POST/PUT/DELETE | `/courses`, `/courses/:id` | courses.* | `search, status, page, limit`; delete is blocked while students are enrolled |
| GET | `/attendance` | attendance.read | `student, course, date (YYYY-MM-DD), status, page, limit` · scoped per role |
| POST | `/attendance` | attendance.create | `{ student, date, status }` · teacher: assigned courses only · one record per student per day |
| PUT/DELETE | `/attendance/:id` | attendance.update / delete | |
| GET | `/results` | results.read | `student, subject, result, page, limit` · scoped per role |
| POST | `/results` | results.create | `{ student, subject, marks }` · grade + result calculated on the server |
| PUT/DELETE | `/results/:id` | results.update / delete | |
| GET | `/roles` | Admin | role cards with user counts |
| GET | `/permissions` | Admin | full matrix |
| PUT | `/permissions/:role` | Admin | `{ matrix }` for `teacher` or `student` |
| GET | `/health` | public | |

List endpoints return `{ data: [...], pagination: { page, limit, total, pages } }`. Validation errors return `400 { message, errors: { field: "..." } }`, duplicates `409`.

**Grades:** ≥90 A+, ≥80 A, ≥70 B, ≥60 C, ≥40 D, <40 F. Result is Pass for ≥40, otherwise Fail. Calculated in a Mongoose `pre('validate')` hook, so it can't be bypassed by the client.

**Activity feed:** every create/update/delete of a student, teacher, course, result or attendance record writes an `ActivityLog` entry. The dashboard reads counts and activity live on every visit.

## Notes

- Students/teachers created by an admin get a login automatically. Password = the optional "Temporary password" field, otherwise `DEFAULT_PASSWORD` from `server/.env`.
- Dashboard "this term" means the last 90 days.
- Not included yet: real password-reset emails ("Forgot password?" is UI-only, as requested), login rate limiting, automated tests.
# project_rupa
