import { Request } from "express";

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy: string | undefined;
  sortOrder: "asc" | "desc";
  skip: number;
  take: number;
}

export const parsePagination = (
  req: Request,
  defaultSort?: string,
): PaginationParams => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawSize = parseInt(String(req.query.pageSize ?? "20"), 10) || 20;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const sortBy = (req.query.sortBy as string | undefined) ?? defaultSort;
  const sortOrder: "asc" | "desc" =
    req.query.sortOrder === "asc" ? "asc" : "desc";

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};

export const buildMeta = (
  pagination: PaginationParams,
  total: number,
) => ({
  page: pagination.page,
  pageSize: pagination.pageSize,
  total,
  totalPages: Math.ceil(total / pagination.pageSize),
});
