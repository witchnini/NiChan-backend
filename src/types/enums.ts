// Application-layer enum constants (SQL Server does not support native enums in Prisma)
// Use these everywhere instead of raw strings.

export const UserRole = {
  ADMIN: "admin",
  ORGANIZER: "organizer",
  CUSTOMER: "customer",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const RequestStatus = {
  NEW: "new",
  REVIEWING: "reviewing",
  QUOTED: "quoted",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

const requestStatuses: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.REVIEWING,
  RequestStatus.QUOTED,
  RequestStatus.CONFIRMED,
  RequestStatus.REJECTED,
];

// Admins can correct a mistaken selection by moving a request back to any other valid status.
export const REQUEST_STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  new: requestStatuses.filter((status) => status !== RequestStatus.NEW),
  reviewing: requestStatuses.filter((status) => status !== RequestStatus.REVIEWING),
  quoted: requestStatuses.filter((status) => status !== RequestStatus.QUOTED),
  confirmed: requestStatuses.filter((status) => status !== RequestStatus.CONFIRMED),
  rejected: requestStatuses.filter((status) => status !== RequestStatus.REJECTED),
};

export const EventStatus = {
  DRAFT: "draft",
  PLANNING: "planning",
  QUOTED: "quoted",
  CONTRACTED: "contracted",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const TaskStatus = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  DONE: "done",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// Allowed transitions for tasks
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["review", "todo"],
  review: ["done", "in_progress"],
  done: [],
};

export const TaskPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const ContractStatus = {
  DRAFT: "draft",
  SENT: "sent",
  ACTIVE: "active",
  LIQUIDATED: "liquidated",
  CANCELLED: "cancelled",
} as const;
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export const DocumentStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  SIGNED: "signed",
  REJECTED: "rejected",
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const NotificationScope = {
  ADMIN: "admin",
  ORGANIZER: "organizer",
  CUSTOMER: "customer",
} as const;
export type NotificationScope = (typeof NotificationScope)[keyof typeof NotificationScope];

export const NotificationType = {
  SYSTEM: "system",
  REQUEST: "request",
  PROJECT: "project",
  CONTRACT: "contract",
  FINANCE: "finance",
  REVIEW: "review",
  STAFFING: "staffing",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ReviewStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  HIDDEN: "hidden",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const VendorStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
  INACTIVE: "inactive",
} as const;
export type VendorStatus = (typeof VendorStatus)[keyof typeof VendorStatus];

export const BudgetItemStatus = {
  PLANNED: "planned",
  APPROVED: "approved",
  COMMITTED: "committed",
  PAID: "paid",
} as const;
export type BudgetItemStatus = (typeof BudgetItemStatus)[keyof typeof BudgetItemStatus];

export const BlogStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  HIDDEN: "hidden",
} as const;
export type BlogStatus = (typeof BlogStatus)[keyof typeof BlogStatus];

export const PortfolioStatus = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
} as const;
export type PortfolioStatus = (typeof PortfolioStatus)[keyof typeof PortfolioStatus];

export const MilestoneStatus = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const AssignmentStatus = {
  INVITED: "invited",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const TransactionStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];
