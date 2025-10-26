-- AlterTable
ALTER TABLE `staff` ADD COLUMN `grace_period_minutes` INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE `studentattendance` ADD COLUMN `status` ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'present';
