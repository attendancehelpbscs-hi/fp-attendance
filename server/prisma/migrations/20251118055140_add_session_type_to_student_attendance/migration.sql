-- AlterTable
ALTER TABLE `studentattendance` ADD COLUMN `session_type` ENUM('AM', 'PM') NOT NULL DEFAULT 'AM';
