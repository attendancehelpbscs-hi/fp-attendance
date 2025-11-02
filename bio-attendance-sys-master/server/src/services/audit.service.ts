import { prisma } from '../db/prisma-client';

export const getAuditLogs = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
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
      skip,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const clearAuditLogs = async () => {
  return await prisma.auditLog.deleteMany({});
};

export const createAuditLog = async (staffId: string, action: string, details?: string) => {
  return await prisma.auditLog.create({
    data: {
      staff_id: staffId,
      action,
      details,
    },
  });
};
