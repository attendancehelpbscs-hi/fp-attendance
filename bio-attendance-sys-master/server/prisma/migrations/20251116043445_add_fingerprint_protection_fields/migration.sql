-- AlterTable
ALTER TABLE `staff` ADD COLUMN `encrypted_fingerprint` LONGTEXT NULL,
    ADD COLUMN `fingerprint_hash` VARCHAR(64) NULL;

-- AlterTable
ALTER TABLE `student` ADD COLUMN `encrypted_fingerprint` LONGTEXT NULL,
    ADD COLUMN `fingerprint_hash` VARCHAR(64) NULL;
