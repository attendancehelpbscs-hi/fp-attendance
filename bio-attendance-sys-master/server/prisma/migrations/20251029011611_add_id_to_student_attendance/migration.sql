/*
  Warnings:

  - The primary key for the `studentattendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `StudentAttendance` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `staff` ADD COLUMN `late_threshold_hours` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `school_start_time` VARCHAR(191) NOT NULL DEFAULT '08:00';

-- AlterTable
ALTER TABLE `studentattendance` ADD COLUMN `id` VARCHAR(191);

-- Populate the id column with unique values
UPDATE `studentattendance` SET `id` = UUID() WHERE `id` IS NULL;

-- Make id not null
ALTER TABLE `studentattendance` MODIFY COLUMN `id` VARCHAR(191) NOT NULL;

-- Drop foreign keys that depend on the primary key
ALTER TABLE `studentattendance` DROP FOREIGN KEY `StudentAttendance_student_id_fkey`;
ALTER TABLE `studentattendance` DROP FOREIGN KEY `StudentAttendance_attendance_id_fkey`;

-- Drop primary key
ALTER TABLE `studentattendance` DROP PRIMARY KEY;

-- Add new primary key
ALTER TABLE `studentattendance` ADD PRIMARY KEY (`id`);

-- Recreate foreign keys
ALTER TABLE `studentattendance` ADD CONSTRAINT `StudentAttendance_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `studentattendance` ADD CONSTRAINT `StudentAttendance_attendance_id_fkey` FOREIGN KEY (`attendance_id`) REFERENCES `Attendance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `StudentAttendance_student_id_attendance_id_idx` ON `StudentAttendance`(`student_id`, `attendance_id`);
