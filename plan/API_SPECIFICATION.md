# NiChan API Specification

## Why endpoint list alone is not enough

A plain endpoint list only tells backend "what route should exist".
It does not tell backend:

- request body shape
- required fields vs optional fields
- query params for filter, sort, pagination
- response payload shape
- authentication and authorization rules
- business validation rules
- stable error codes
- id format and status transitions

Because of that, the old plan was enough for backlog tracking, but **not enough for implementation**.
This file is the implementation contract.

## Base conventions

- Base URL: `/api`
- Content type: `application/json`
- IDs: UUID string unless legacy code requires custom code like `YC-001`, `HD-2026-001`
- Timestamps: ISO 8601 UTC
- Currency in DB: decimal, response can also expose formatted text if frontend needs it

## Standard success envelope

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

## Standard error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

## Common error codes

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `INVALID_STATUS_TRANSITION`
- `RATE_LIMITED`
- `INTERNAL_SERVER_ERROR`

## Pagination convention

Query:

- `page`: default `1`
- `pageSize`: default `20`, max `100`
- `sortBy`
- `sortOrder`: `asc | desc`

Response meta:

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 120,
  "totalPages": 6
}
```

## Auth convention

- Public routes: no auth
- Customer routes: authenticated `customer`
- Organizer routes: authenticated `organizer` or `admin` with scope rules
- Admin routes: authenticated `admin`

## Module contracts

### 0. Foundation

#### `GET /api/health`

- Auth: no
- Response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "nichan-backend",
    "timestamp": "2026-04-15T09:00:00.000Z"
  }
}
```

#### `GET /api/meta/enums`

- Auth: no
- Response:

```json
{
  "success": true,
  "data": {
    "requestStatuses": ["new", "reviewing", "quoted", "confirmed", "rejected"],
    "eventStatuses": ["draft", "planning", "quoted", "contracted", "in_progress", "completed", "cancelled"],
    "taskStatuses": ["todo", "in_progress", "review", "done"]
  }
}
```

### 1. Public Content

#### `GET /api/public/services`

- Auth: no
- Query:
  - `category`
  - `search`
  - `featured`
- Response item:

```json
{
  "id": "uuid",
  "title": "Tiệc Cưới Truyền Thống",
  "slug": "tiec-cuoi-truyen-thong",
  "category": "Tiệc cưới",
  "priceRange": {
    "from": 150000000,
    "to": 300000000,
    "label": "150 - 300 triệu"
  },
  "guestRange": {
    "from": 100,
    "to": 300,
    "label": "100-300"
  },
  "location": "TP.HCM",
  "imageUrl": "https://...",
  "shortDescription": "..."
}
```

#### `GET /api/public/services/:slug`

- Auth: no
- Errors:
  - `404 NOT_FOUND` when service slug does not exist

#### `GET /api/public/service-categories`

- Response:

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Tất cả", "slug": "tat-ca" }
  ]
}
```

#### `GET /api/public/blog-posts`

- Query:
  - `category`
  - `status=published`
  - `search`
  - pagination

#### `GET /api/public/blog-posts/:id`

- Errors:
  - `404 NOT_FOUND`

#### `GET /api/public/portfolio`

- Query:
  - `category`
  - `visibleOnly`

### 2. Contact / Lead Intake

#### `POST /api/public/consultation-requests`

- Auth: optional
- Request:

```json
{
  "customerName": "Nguyen Van A",
  "phone": "0901234567",
  "email": "a@example.com",
  "eventType": "Tiệc cưới",
  "eventDate": "2026-08-20",
  "guestCount": 300,
  "budgetRange": "200-300tr",
  "location": "TP.HCM",
  "note": "Can venue trong nha"
}
```

- Validation:
  - `customerName`, `phone`, `email`, `eventType` required
  - phone format must be valid
  - email format must be valid
- Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestCode": "YC-2026-001",
    "status": "new"
  }
}
```

#### `POST /api/auth/register`

- Request:

```json
{
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0901234567",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```

- Errors:
  - `409 CONFLICT` if email already exists
  - `VALIDATION_ERROR` if password confirmation fails

#### `POST /api/auth/login`

- Request:

```json
{
  "email": "a@example.com",
  "password": "secret123"
}
```

- Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-or-session-token",
    "user": {
      "id": "uuid",
      "email": "a@example.com",
      "role": "customer",
      "displayName": "Nguyen Van A"
    }
  }
}
```

### 3. Customer Event Workspace

#### `GET /api/customer/dashboard`

- Auth: customer
- Response:

```json
{
  "success": true,
  "data": {
    "events": [],
    "recentActivities": [],
    "contracts": [],
    "transactions": []
  }
}
```

#### `GET /api/customer/events`

- Query:
  - `status`
  - `upcomingOnly`

#### `GET /api/customer/events/:eventId/milestones`

- Errors:
  - `404 NOT_FOUND`
  - `403 FORBIDDEN` if event does not belong to current customer

#### `GET /api/customer/events/:eventId/chat-messages`

- Query:
  - `cursor`
  - `limit`

#### `POST /api/customer/events/:eventId/chat-messages`

- Request:

```json
{
  "message": "Em oi, cho chi xin update venue."
}
```

- Validation:
  - `message` required
  - max length recommended 2000 chars

#### `POST /api/customer/reviews`

- Request:

```json
{
  "eventId": "uuid",
  "ratingOverall": 5,
  "comment": "Rat hai long",
  "criteriaScores": [
    { "key": "venue", "score": 5 },
    { "key": "service", "score": 5 }
  ]
}
```

- Errors:
  - `CONFLICT` if review already submitted

### 4. Customer Profile

#### `GET /api/customer/profile`

- Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Nguyen Van A",
    "email": "a@example.com",
    "phone": "0901234567",
    "address": "Q1, HCM",
    "bio": ""
  }
}
```

#### `PUT /api/customer/profile`

- Request:
  - `name`
  - `phone`
  - `address`
  - `bio`

#### `PUT /api/customer/profile/password`

- Request:
  - `oldPassword`
  - `newPassword`
  - `confirmPassword`

### 5. Organizer Dashboard

#### `GET /api/organizer/dashboard`

- Auth: organizer
- Response sections:
  - `projectProgress`
  - `tasksByStatus`
  - `weeklyWorkload`
  - `upcomingTasks`

#### `GET /api/organizer/notifications`

- Query:
  - `read`
  - `type`
  - pagination

#### `PATCH /api/organizer/notifications/:id/read`

- Response:
  - updated notification

### 6. Organizer Projects

#### `GET /api/organizer/projects/:projectId/kanban`

- Response:

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "name": "Tiec cuoi Minh & Ha"
    },
    "columns": [
      {
        "id": "todo",
        "title": "Chờ xử lý",
        "tasks": []
      }
    ]
  }
}
```

#### `POST /api/organizer/tasks`

- Request:

```json
{
  "eventId": "uuid",
  "title": "Dat venue",
  "assigneeUserId": "uuid",
  "dueAt": "2026-05-01T09:00:00.000Z",
  "priority": "high",
  "status": "todo"
}
```

- Validation:
  - `eventId`, `title`, `priority`, `status` required

#### `PATCH /api/organizer/tasks/:taskId/status`

- Request:

```json
{
  "status": "done"
}
```

- Errors:
  - `INVALID_STATUS_TRANSITION`

### 7. Organizer Staff

#### `GET /api/organizer/staff`

- Query:
  - `status`
  - `search`

#### `POST /api/organizer/staff`

- Request:
  - `name`
  - `role`
  - `phone`
  - `email`
  - `shift`

### 8. Organizer Vendors

#### `GET /api/organizer/vendors`

- Query:
  - `category`
  - `status`
  - `search`

#### `POST /api/organizer/vendors`

- Request:
  - `name`
  - `categoryId`
  - `phone`
  - `email`
  - `address`

### 9. Organizer Budget

#### `GET /api/organizer/budgets/:projectId`

- Response:
  - project summary
  - budget items
  - estimated total
  - actual total

#### `POST /api/organizer/budget-items`

- Request:
  - `projectBudgetId`
  - `category`
  - `estimatedAmount`
  - `actualAmount`
  - `note`

### 10. Organizer Reports

Read-only reporting endpoints.
They return aggregated arrays ready for charts.

### 11. Organizer Profile

Same contract pattern as customer profile, scope is organizer identity.

### 12. Admin Dashboard

#### `GET /api/admin/dashboard`

- Response sections:
  - `monthlyRevenue`
  - `eventTypes`
  - `recentRequests`
  - `upcomingEvents`
  - `notificationSummary`

### 13. Admin Requests

#### `GET /api/admin/requests`

- Query:
  - `status`
  - `search`
  - `managerId`
  - pagination

#### `PATCH /api/admin/requests/:requestId/assign-manager`

- Request:

```json
{
  "managerUserId": "uuid"
}
```

- Errors:
  - `404 NOT_FOUND`
  - `CONFLICT` if assigned manager is inactive

#### `PATCH /api/admin/requests/:requestId/status`

- Request:

```json
{
  "status": "quoted"
}
```

- Validation:
  - only allowed transitions

### 14. Admin Users

#### `GET /api/admin/users`

- Query:
  - `role`
  - `status`
  - `search`
  - pagination

#### `POST /api/admin/users`

- Request:
  - `name`
  - `email`
  - `phone`
  - `role`
  - `password`

### 15. Admin Contracts

#### `GET /api/admin/contracts`

- Query:
  - `status`
  - `search`
  - pagination

#### `POST /api/admin/contracts`

- Request:

```json
{
  "eventId": "uuid",
  "customerUserId": "uuid",
  "totalValue": 250000000,
  "versionLabel": "1.0",
  "scopeText": "Tron goi tiec cuoi 300 khach",
  "paymentTerms": "30-40-30",
  "generalTerms": "..."
}
```

#### `PATCH /api/admin/contracts/:contractId/send`

- Behavior:
  - mark contract as `sent`
  - set `sentAt`

### 16. Admin Finance

Read-only aggregate endpoints:

- `GET /api/admin/finance/project-summary`
- `GET /api/admin/finance/monthly-pl`
- `GET /api/admin/finance/expenses`

### 17. Admin Content

#### `POST /api/admin/content/portfolio`

- Request:
  - `title`
  - `category`
  - `status`
  - `coverImageUrl`

#### `POST /api/admin/content/blog-posts`

- Request:
  - `title`
  - `category`
  - `status`
  - `content`
  - `publishedAt`

#### `PATCH /api/admin/content/reviews/:id/approve`

- Behavior:
  - mark review as `approved`

### 18. Admin Projects

Same resource pattern as organizer projects, but admin scope covers all managed projects.

### 19. Admin Staff

CRUD for staff and schedule read endpoint.

### 20. Admin Vendors

CRUD for vendor catalog and vendor status.

### 21. Admin Reports

Read-only aggregate endpoints for:

- conversion
- revenue by type
- top events
- staff performance

### 22. Admin Profile

Same pattern as customer and organizer profile.

## Minimal implementation checklist for each module

Before coding a module, backend should have:

1. target tables from `DATABASE_DESIGN.md`
2. request DTOs and validation rules
3. response DTOs
4. error cases and status transitions
5. auth/role guard
6. test checklist

## Final note

Backend cannot be built safely from endpoint names alone.
The combination required is:

- `API_IMPLEMENTATION_PLAN.md` for order and tracking
- `DATABASE_DESIGN.md` for persistence model
- `API_SPECIFICATION.md` for request/response/error contract
