import { prisma } from '../db/prisma-client';

export const getAuditLogs = async () => {
  return await prisma.auditLog.findMany({
    include: {
      staff: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const clearAuditLogs = async () => {
  return await prisma.auditLog.deleteMany({});
};
