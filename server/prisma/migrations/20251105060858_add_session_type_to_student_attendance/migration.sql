/*
  Warnings:

  - Added the required column `session_type` to the `StudentAttendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `studentattendance` ADD COLUMN `session_type` ENUM('AM', 'PM') NOT NULL DEFAULT 'AM',
    MODIFY `status` ENUM('present', 'absent') NOT NULL DEFAULT 'present';
