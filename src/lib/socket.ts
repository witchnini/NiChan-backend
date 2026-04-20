import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyToken } from "./jwt";
import { env } from "../config/env";

let io: SocketServer;

/**
 * Map userId -> Set of socketIds để biết ai đang online
 */
const onlineUsers = new Map<string, Set<string>>();

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.corsOrigin === "*" ? true : env.corsOrigin,
      methods: ["GET", "POST"],
    },
  });

  // Middleware xác thực JWT trước khi accept socket
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("UNAUTHENTICATED"));
    }

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("UNAUTHENTICATED"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join event chat room
    // Client gửi: socket.emit("join_thread", { threadId })
    socket.on("join_thread", ({ threadId }: { threadId: string }) => {
      socket.join(`thread:${threadId}`);
    });

    socket.on("leave_thread", ({ threadId }: { threadId: string }) => {
      socket.leave(`thread:${threadId}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
    });
  });

  return io;
};

/**
 * Gửi message mới đến tất cả members trong thread
 */
export const emitNewMessage = (
  threadId: string,
  message: {
    id: string;
    threadId: string;
    senderUserId: string;
    senderName: string;
    messageText: string;
    sentAt: Date;
  },
) => {
  if (!io) return;
  io.to(`thread:${threadId}`).emit("new_message", message);
};

/**
 * Gửi notification đến 1 user cụ thể (tất cả tab/thiết bị)
 */
export const emitNotification = (
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string | null;
    message: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: Date;
  },
) => {
  if (!io) return;
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  for (const socketId of sockets) {
    io.to(socketId).emit("notification", notification);
  }
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};
