import createError from 'http-errors';
import { prisma } from '../db/prisma-client';

export const getHolidays = async () => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' }
    });
    return holidays;
  } catch (err) {
    throw err;
  }
};

export const getHolidayById = async (id: string) => {
  try {
    const holiday = await prisma.holiday.findUnique({
      where: { id }
    });
    if (!holiday) throw createError.NotFound('Holiday not found');
    return holiday;
  } catch (err) {
    throw err;
  }
};

export const createHoliday = async (data: { date: string; name: string; type?: string }) => {
  try {
    // Check if holiday already exists for this date
    const existingHoliday = await prisma.holiday.findUnique({
      where: { date: data.date },
    });

    if (existingHoliday) {
      throw createError.Conflict('A holiday already exists for this date');
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: data.date,
        name: data.name,
        type: data.type || 'regular'
      }
    });
    return holiday;
  } catch (err) {
    throw err;
  }
};

export const updateHoliday = async (id: string, data: { date?: string; name?: string; type?: string }) => {
  try {
    const holiday = await prisma.holiday.update({
      where: { id },
      data
    });
    return holiday;
  } catch (err) {
    throw err;
  }
};

export const deleteHoliday = async (id: string) => {
  try {
    await prisma.holiday.delete({
      where: { id }
    });
    return { deleted: true };
  } catch (err) {
    throw err;
  }
};

export const isDateHoliday = async (date: string): Promise<boolean> => {
  try {
    const holiday = await prisma.holiday.findFirst({
      where: { date }
    });
    return !!holiday;
  } catch (err) {
    return false;
  }
};