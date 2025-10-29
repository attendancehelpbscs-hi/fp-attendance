/*
  Warnings:

  - The primary key for the `studentattendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `StudentAttendance` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `staff` ADD COLUMN `late_threshold_hours` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `school_start_time` VARCHAR(191) NOT NULL DEFAULT '08:00';

-- AlterTable
ALTER TABLE `studentattendance` DROP PRIMARY KEY,
    ADD COLUMN `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE INDEX `StudentAttendance_student_id_attendance_id_idx` ON `StudentAttendance`(`student_id`, `attendance_id`);
