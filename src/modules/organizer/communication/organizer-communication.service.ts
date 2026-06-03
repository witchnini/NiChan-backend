import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";

// Chat dùng lại logic của customer (ensureEventAccess đã hỗ trợ cả organizer)
export { getChatMessages, sendChatMessage, deleteChatMessage } from "../../customer/customer.service";

// ─── Documents (organizer view) ─────────────────────────────────────────────────

const assertOrganizerEvent = async (eventId: string, organizerUserId: string) => {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerUserId },
    select: { id: true, name: true },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found or access denied", 404);
  return event;
};

export const getOrganizerEventDocuments = async (eventId: string, organizerUserId: string) => {
  await assertOrganizerEvent(eventId, organizerUserId);

  return prisma.document.findMany({
    where: { eventId },
    include: { event: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const createOrganizerDocument = async (
  eventId: string,
  organizerUserId: string,
  input: { name: string; fileType: string; fileUrl: string },
) => {
  const event = await assertOrganizerEvent(eventId, organizerUserId);

  const document = await prisma.document.create({
    data: {
      eventId,
      name: input.name,
      fileType: input.fileType,
      fileUrl: input.fileUrl,
      uploadedById: organizerUserId,
      status: "approved",
    },
    include: { event: { select: { id: true, name: true } } },
  });

  await prisma.eventActivity.create({
    data: {
      eventId,
      actorUserId: organizerUserId,
      iconName: "file-text",
      message: `Đã thêm tài liệu "${input.name}" vào dự án ${event.name}.`,
    },
  });

  return document;
};
