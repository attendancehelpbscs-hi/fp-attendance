/*
  Warnings:

  - Added the required column `firstName` to the `Staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `staff` ADD COLUMN `firstName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `lastName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `profilePicture` LONGTEXT NULL;

-- Update existing records to split the name field into firstName and lastName
UPDATE `staff` SET `firstName` = SUBSTRING_INDEX(`name`, ' ', 1), `lastName` = TRIM(SUBSTRING(`name`, LENGTH(SUBSTRING_INDEX(`name`, ' ', 1)) + 1)) WHERE `name` IS NOT NULL AND `name` != '';
