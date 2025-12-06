-- AlterTable
ALTER TABLE `staff` ADD COLUMN `pm_late_cutoff_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pm_late_cutoff_time` VARCHAR(191) NULL DEFAULT '12:50';
