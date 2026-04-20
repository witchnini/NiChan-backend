# NiChan API Implementation Plan

## Documents

- Execution plan: this file
- API contract: `API_SPECIFICATION.md`
- Database design: `DATABASE_DESIGN.md`

## Rule

- Only implement 1 module in each round
- After finishing 1 module: stop, report, let user test
- Do not continue to the next module until the user confirms

## Status Legend

- `[ ]` not started
- `[-]` in progress
- `[x]` implemented and handed off for testing
- `[!]` frontend still uses local page state and will need wiring later

## Suggested Order

1. `[ ]` Foundation
2. `[ ]` Public Content
3. `[ ]` Contact / Lead Intake
4. `[ ]` Admin Requests
5. `[ ]` Customer Event Workspace
6. `[ ]` Organizer Projects
7. `[ ]` Organizer Dashboard
8. `[ ]` Admin Dashboard
9. `[ ]` Admin Contracts
10. `[ ]` Admin Users
11. `[ ]` Organizer Staff
12. `[ ]` Organizer Budget
13. `[ ]` Admin Content
14. `[ ]` Organizer Vendors
15. `[ ]` Admin Finance
16. `[ ]` Organizer Reports
17. `[ ]` Admin Reports
18. `[ ]` Admin Staff
19. `[ ]` Admin Vendors
20. `[ ]` Customer Profile
21. `[ ]` Organizer Profile
22. `[ ]` Admin Profile

## Module Notes

### Foundation

- Scope: response envelope, error handler, validation, auth skeleton, role guard, pagination/filter/sort conventions

### Public Content

- Pages: home, services, service detail, portfolio, blog, blog detail, about

### Contact / Lead Intake

- Pages: contact, login, register

### Customer Event Workspace

- Pages: customer dashboard, my events, event tracking, contracts, reviews

### Organizer Dashboard

- Pages: organizer dashboard, layout notifications

### Organizer Projects

- Page: organizer kanban and gantt
- `[!]` local task CRUD exists in frontend

### Organizer Staff

- Page: organizer staff

### Organizer Vendors

- Page: organizer vendors

### Organizer Budget

- Page: organizer budget
- `[!]` local budget item edit exists in frontend

### Organizer Reports

- Page: organizer reports

### Organizer Profile

- Page: organizer profile

### Admin Dashboard

- Pages: admin dashboard, layout, notifications

### Admin Requests

- Page: admin requests
- `[!]` frontend supports assign manager, status update, delete

### Admin Users

- Page: admin users

### Admin Contracts

- Page: admin contracts
- `[!]` frontend supports create, edit, delete, send

### Admin Finance

- Page: admin finance

### Admin Content

- Page: admin content
- `[!]` frontend supports CRUD portfolio/blog and review moderation

### Admin Projects

- Page: admin projects
- `[!]` local kanban task state exists in frontend

### Admin Staff

- Page: admin staff
- `[!]` local CRUD exists in frontend

### Admin Vendors

- Page: admin vendors

### Admin Reports

- Page: admin reports

### Customer Profile

- Page: customer profile

### Admin Profile

- Page: admin profile
