-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT,
    "bio" TEXT,
    "birthDate" TIMESTAMP(3),

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "organizer_profiles" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "address" TEXT,
    "bio" TEXT,

    CONSTRAINT "organizer_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT,
    "bio" TEXT,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "address" TEXT,
    "employmentStatus" TEXT NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceFrom" DECIMAL(65,30),
    "priceTo" DECIMAL(65,30),
    "guestFrom" INTEGER,
    "guestTo" INTEGER,
    "locationText" TEXT,
    "coverImageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "guestCount" INTEGER,
    "coverImageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "eventId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "coverImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "roleText" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_requests" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "guestCount" INTEGER,
    "budgetRange" TEXT,
    "locationText" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assignedManagerId" TEXT,
    "customerUserId" TEXT,
    "quotedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "customerUserId" TEXT NOT NULL,
    "organizerUserId" TEXT,
    "consultationRequestId" TEXT,
    "eventDate" TIMESTAMP(3),
    "locationText" TEXT,
    "guestCount" INTEGER,
    "budgetEstimated" DECIMAL(65,30),
    "budgetActual" DECIMAL(65,30),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_milestones" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "milestoneDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'todo',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_activities" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "iconName" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigneeUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_status_histories" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vendor_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "contactName" TEXT,
    "address" TEXT NOT NULL,
    "ratingAvg" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_vendors" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "serviceNote" TEXT,
    "contractValue" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_schedules" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "eventId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff_assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "roleText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contractCode" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentVersion" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalValue" DECIMAL(65,30) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "scopeText" TEXT NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "generalTerms" TEXT NOT NULL,
    "documentUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "contractId" TEXT,
    "uploadedById" TEXT,
    "name" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "contractId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_budgets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'VND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" TEXT NOT NULL,
    "projectBudgetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(65,30) NOT NULL,
    "actualAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "note" TEXT,
    "vendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "ratingOverall" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_criteria" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "review_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_scores" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reviewCriteriaId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "review_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_thread_members" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_thread_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_slug_key" ON "portfolio_items"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_requests_requestCode_key" ON "consultation_requests"("requestCode");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_categories_slug_key" ON "vendor_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractCode_key" ON "contracts"("contractCode");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_eventId_customerUserId_key" ON "reviews"("eventId", "customerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "review_criteria_key_key" ON "review_criteria"("key");

-- CreateIndex
CREATE UNIQUE INDEX "review_scores_reviewId_reviewCriteriaId_key" ON "review_scores"("reviewId", "reviewCriteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_thread_members_threadId_userId_key" ON "chat_thread_members"("threadId", "userId");

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_consultationRequestId_fkey" FOREIGN KEY ("consultationRequestId") REFERENCES "consultation_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_milestones" ADD CONSTRAINT "event_milestones_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_status_histories" ADD CONSTRAINT "task_status_histories_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "project_tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_status_histories" ADD CONSTRAINT "task_status_histories_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "vendor_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_projectBudgetId_fkey" FOREIGN KEY ("projectBudgetId") REFERENCES "project_budgets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "review_scores" ADD CONSTRAINT "review_scores_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "review_scores" ADD CONSTRAINT "review_scores_reviewCriteriaId_fkey" FOREIGN KEY ("reviewCriteriaId") REFERENCES "review_criteria"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_thread_members" ADD CONSTRAINT "chat_thread_members_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_thread_members" ADD CONSTRAINT "chat_thread_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
