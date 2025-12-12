import { prisma } from '../db/prisma-client';

export const getTeachersFromDb = async (page: number = 1, perPage: number = 10) => {
  const skip = (page - 1) * perPage;

  const [teachers, totalCount] = await Promise.all([
    prisma.staff.findMany({
      where: {
        role: 'TEACHER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        section: true,
        grade: true,
        matric_no: true,
        role: true,
        approval_status: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage
    }),
    prisma.staff.count({
      where: {
        role: 'TEACHER'
      }
    })
  ]);

  return {
    teachers,
    totalCount,
    totalPages: Math.ceil(totalCount / perPage),
    currentPage: page,
    perPage
  };
};

export const getTeacherById = async (id: string) => {
  const teacher = await prisma.staff.findFirst({
    where: {
      id,
      role: 'TEACHER'
    },
    select: {
      id: true,
      name: true,
      email: true,
      section: true,
      created_at: true,
      updated_at: true
    }
  });

  return teacher;
};

export const createTeacher = async (teacherData: {
  name: string;
  email: string;
  password: string;
  section?: string;
}) => {
  const teacher = await prisma.staff.create({
    data: {
      ...teacherData,
      role: 'TEACHER'
    },
    select: {
      id: true,
      name: true,
      email: true,
      section: true,
      created_at: true,
      updated_at: true
    }
  });

  return teacher;
};

export const updateTeacher = async (id: string, updateData: Partial<{
  name: string;
  email: string;
  section: string;
}>) => {
  const teacher = await prisma.staff.update({
    where: {
      id,
      role: 'TEACHER'
    },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      section: true,
      created_at: true,
      updated_at: true
    }
  });

  return teacher;
};

export const deleteTeacher = async (id: string) => {
  await prisma.staff.delete({
    where: {
      id,
      role: 'TEACHER'
    }
  });

  return true;
};

export const getPendingTeachersFromDb = async () => {
  const teachers = await prisma.staff.findMany({
    where: {
      role: 'TEACHER',
      approval_status: 'PENDING'
    },
    select: {
      id: true,
      name: true,
      email: true,
      section: true,
      grade: true,
      matric_no: true,
      created_at: true,
      approval_status: true
    },
    orderBy: { created_at: 'desc' }
  });

  return teachers;
};

export const approveTeacher = async (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
  const teacher = await prisma.staff.update({
    where: { id },
    data: {
      approval_status: status
    },
    select: {
      id: true,
      name: true,
      email: true,
      section: true,
      approval_status: true,
      created_at: true
    }
  });

  return teacher;
};