/*
  Warnings:

  - The values [late,absent] on the enum `StudentAttendance_status` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `grade` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `course` ADD COLUMN `grade` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `studentattendance` MODIFY `status` ENUM('present') NOT NULL DEFAULT 'present';
