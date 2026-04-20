# NiChan Database Design

## Why this file exists

Frontend gives us screen fields and user flows, but backend still needs a domain model.
This document turns frontend data into a database design that backend can build later.

## Design principles

- Use one `users` table for authentication
- Separate profile tables by role when fields differ
- Model event management around `events`
- Keep lookup values in enums or dictionary tables depending on churn
- Store money as `Decimal`
- Store timestamps in UTC
- Prefer soft delete on business data
- Audit important status changes

## Main domains

1. Identity and access
2. Public content
3. Lead intake and sales
4. Event execution
5. Collaboration and notifications
6. Finance and reporting

## Core enums

- `user_role`: `admin | organizer | customer | staff`
- `user_status`: `active | inactive | suspended`
- `request_status`: `new | reviewing | quoted | confirmed | rejected`
- `event_status`: `draft | planning | quoted | contracted | in_progress | completed | cancelled`
- `task_status`: `todo | in_progress | review | done`
- `task_priority`: `low | medium | high`
- `contract_status`: `draft | sent | active | liquidated | cancelled`
- `document_status`: `pending | approved | signed | rejected`
- `notification_scope`: `admin | organizer | customer | staff`
- `notification_type`: `system | request | project | contract | finance | review | staffing`
- `review_status`: `pending | approved | hidden`
- `vendor_status`: `active | paused | inactive`
- `budget_item_status`: `planned | approved | committed | paid`
- `blog_status`: `draft | scheduled | published | hidden`
- `portfolio_status`: `visible | hidden`

## Tables

### 1. users

Purpose:

- login identity for all roles

Fields:

- `id` uuid pk
- `email` unique
- `password_hash`
- `role`
- `status`
- `display_name`
- `phone`
- `avatar_url` nullable
- `last_login_at` nullable
- `created_at`
- `updated_at`
- `deleted_at` nullable

### 2. customer_profiles

Fields:

- `user_id` pk fk -> users.id
- `full_name`
- `address` nullable
- `bio` nullable
- `birth_date` nullable

### 3. organizer_profiles

Fields:

- `user_id` pk fk -> users.id
- `full_name`
- `job_title`
- `address` nullable
- `bio` nullable

### 4. admin_profiles

Fields:

- `user_id` pk fk -> users.id
- `full_name`
- `address` nullable
- `bio` nullable

### 5. staff_profiles

Fields:

- `user_id` pk fk -> users.id
- `full_name`
- `job_title`
- `address` nullable
- `employment_status`

### 6. service_categories

Fields:

- `id` uuid pk
- `name`
- `slug` unique
- `description` nullable
- `sort_order`
- `is_active`

### 7. services

Fields:

- `id` uuid pk
- `category_id` fk -> service_categories.id
- `title`
- `slug` unique
- `short_description`
- `description`
- `price_from` decimal nullable
- `price_to` decimal nullable
- `guest_from` int nullable
- `guest_to` int nullable
- `location_text` nullable
- `cover_image_url` nullable
- `is_featured`
- `is_active`

### 8. portfolio_items

Fields:

- `id` uuid pk
- `title`
- `slug` unique
- `category`
- `guest_count` nullable
- `cover_image_url`
- `status`
- `view_count`
- `event_id` nullable fk -> events.id
- `published_at` nullable
- `created_at`
- `updated_at`

### 9. blog_posts

Fields:

- `id` uuid pk
- `title`
- `slug` unique
- `category`
- `excerpt` nullable
- `content` nullable
- `cover_image_url` nullable
- `status`
- `view_count`
- `published_at` nullable
- `created_by` fk -> users.id
- `updated_by` fk -> users.id nullable
- `created_at`
- `updated_at`

### 10. testimonials

Fields:

- `id` uuid pk
- `customer_name`
- `role_text`
- `content`
- `rating`
- `is_featured`
- `is_active`

### 11. consultation_requests

Purpose:

- stores contact form and inbound request data

Fields:

- `id` uuid pk
- `request_code` unique
- `customer_name`
- `phone`
- `email`
- `event_type`
- `event_date` nullable
- `guest_count` nullable
- `budget_range` nullable
- `location_text` nullable
- `note` nullable
- `status`
- `assigned_manager_id` nullable fk -> users.id
- `customer_user_id` nullable fk -> users.id
- `quoted_at` nullable
- `confirmed_at` nullable
- `rejected_at` nullable
- `created_at`
- `updated_at`

### 12. events

Purpose:

- central entity for all real projects

Fields:

- `id` uuid pk
- `name`
- `slug` unique nullable
- `type`
- `status`
- `customer_user_id` fk -> users.id
- `organizer_user_id` nullable fk -> users.id
- `consultation_request_id` nullable fk -> consultation_requests.id
- `event_date` nullable
- `location_text` nullable
- `guest_count` nullable
- `budget_estimated` decimal nullable
- `budget_actual` decimal nullable
- `progress_percent` default 0
- `summary` nullable
- `created_at`
- `updated_at`
- `completed_at` nullable

### 13. event_milestones

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `title`
- `description` nullable
- `milestone_date` nullable
- `status`
- `sort_order`
- `created_at`
- `updated_at`

### 14. event_activities

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `actor_user_id` nullable fk -> users.id
- `icon_name` nullable
- `message`
- `created_at`

### 15. project_tasks

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `title`
- `description` nullable
- `status`
- `priority`
- `assignee_user_id` nullable fk -> users.id
- `due_at` nullable
- `sort_order`
- `created_by` fk -> users.id
- `created_at`
- `updated_at`
- `completed_at` nullable

### 16. task_status_histories

Fields:

- `id` uuid pk
- `task_id` fk -> project_tasks.id
- `from_status` nullable
- `to_status`
- `changed_by` fk -> users.id
- `changed_at`

### 17. vendor_categories

Fields:

- `id` uuid pk
- `name`
- `slug` unique
- `is_active`

### 18. vendors

Fields:

- `id` uuid pk
- `name`
- `category_id` fk -> vendor_categories.id
- `phone` nullable
- `email` nullable
- `contact_name` nullable
- `address`
- `rating_avg` decimal nullable
- `status`
- `note` nullable
- `created_at`
- `updated_at`

### 19. event_vendors

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `vendor_id` fk -> vendors.id
- `service_note` nullable
- `contract_value` decimal nullable
- `status`
- `created_at`

### 20. shift_schedules

Fields:

- `id` uuid pk
- `staff_user_id` fk -> users.id
- `work_date`
- `start_time`
- `end_time`
- `event_id` nullable fk -> events.id
- `note` nullable
- `created_at`
- `updated_at`

### 21. event_staff_assignments

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `staff_user_id` fk -> users.id
- `role_text`
- `status`
- `assigned_at`

### 22. contracts

Fields:

- `id` uuid pk
- `contract_code` unique
- `event_id` fk -> events.id
- `customer_user_id` fk -> users.id
- `status`
- `current_version`
- `signed_at` nullable
- `sent_at` nullable
- `total_value` decimal
- `created_by` fk -> users.id
- `created_at`
- `updated_at`

### 23. contract_versions

Fields:

- `id` uuid pk
- `contract_id` fk -> contracts.id
- `version_label`
- `scope_text`
- `payment_terms`
- `general_terms`
- `document_url` nullable
- `created_by` fk -> users.id
- `created_at`

### 24. documents

Fields:

- `id` uuid pk
- `event_id` nullable fk -> events.id
- `contract_id` nullable fk -> contracts.id
- `uploaded_by` nullable fk -> users.id
- `name`
- `file_type`
- `file_url`
- `status`
- `created_at`

### 25. transactions

Fields:

- `id` uuid pk
- `event_id` nullable fk -> events.id
- `contract_id` nullable fk -> contracts.id
- `description`
- `amount` decimal
- `transaction_date`
- `payment_method` nullable
- `status`
- `created_at`

### 26. project_budgets

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `name`
- `currency_code`
- `created_at`
- `updated_at`

### 27. budget_items

Fields:

- `id` uuid pk
- `project_budget_id` fk -> project_budgets.id
- `category`
- `estimated_amount` decimal
- `actual_amount` decimal default 0
- `status`
- `note` nullable
- `vendor_id` nullable fk -> vendors.id
- `created_at`
- `updated_at`

### 28. reviews

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `customer_user_id` fk -> users.id
- `rating_overall`
- `comment`
- `status`
- `submitted_at` nullable
- `approved_at` nullable
- `approved_by` nullable fk -> users.id
- `created_at`
- `updated_at`

### 29. review_criteria

Fields:

- `id` uuid pk
- `key` unique
- `label`
- `sort_order`
- `is_active`

### 30. review_scores

Fields:

- `id` uuid pk
- `review_id` fk -> reviews.id
- `review_criteria_id` fk -> review_criteria.id
- `score`

### 31. chat_threads

Fields:

- `id` uuid pk
- `event_id` fk -> events.id
- `created_at`

### 32. chat_thread_members

Fields:

- `id` uuid pk
- `thread_id` fk -> chat_threads.id
- `user_id` fk -> users.id
- `joined_at`

### 33. chat_messages

Fields:

- `id` uuid pk
- `thread_id` fk -> chat_threads.id
- `sender_user_id` fk -> users.id
- `message_text`
- `sent_at`
- `deleted_at` nullable

### 34. notifications

Fields:

- `id` uuid pk
- `user_id` fk -> users.id
- `scope`
- `type`
- `title` nullable
- `message`
- `entity_type` nullable
- `entity_id` nullable
- `is_read`
- `read_at` nullable
- `created_at`

## Main relationships

- one `user` can own one role profile
- one `customer` can have many `consultation_requests`
- one `consultation_request` can become one `event`
- one `event` belongs to one `customer`, optional one `organizer`
- one `event` has many milestones, tasks, activities, budgets, documents, transactions, reviews
- one `event` can have many vendors and many staff assignments
- one `contract` belongs to one `event`
- one `review` belongs to one event and one customer

## Reporting note

The frontend has many charts. Most of them should not become physical tables.
They should be computed from:

- `consultation_requests`
- `events`
- `contracts`
- `transactions`
- `budget_items`
- `project_tasks`
- `reviews`
- `event_staff_assignments`

## MVP recommendation

If backend is built incrementally, create tables in this order:

1. `users`, profiles, auth support
2. `service_categories`, `services`, `portfolio_items`, `blog_posts`, `testimonials`
3. `consultation_requests`
4. `events`, `event_milestones`, `event_activities`
5. `contracts`, `contract_versions`, `documents`, `transactions`
6. `project_tasks`, `task_status_histories`
7. `vendors`, `vendor_categories`, `event_vendors`
8. `project_budgets`, `budget_items`
9. `reviews`, `review_criteria`, `review_scores`
10. `chat_threads`, `chat_thread_members`, `chat_messages`, `notifications`

## Important note

This is the missing piece that the old API list did not have.
Without this database design, backend can guess routes, but cannot implement stable business logic correctly.
