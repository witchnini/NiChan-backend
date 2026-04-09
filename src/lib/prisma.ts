import { PrismaClient } from "@prisma/client";

declare global {
  // Reuse the Prisma client in development to avoid exhausting connections.
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
