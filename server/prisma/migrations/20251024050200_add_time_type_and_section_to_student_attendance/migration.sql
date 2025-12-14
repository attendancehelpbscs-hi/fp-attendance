-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `Attendance_course_id_fkey`;

-- AlterTable
ALTER TABLE `attendance` DROP COLUMN `course_id`;

-- AlterTable
ALTER TABLE `studentattendance` ADD COLUMN `section` VARCHAR(191) NOT NULL DEFAULT 'A',
ADD COLUMN `time_type` ENUM('IN', 'OUT') NOT NULL DEFAULT 'IN';
