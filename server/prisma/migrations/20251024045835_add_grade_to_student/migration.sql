/*
  Warnings:

  - Added the required column `grade` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `student` ADD COLUMN `grade` VARCHAR(191) NOT NULL DEFAULT 'Grade 1';

-- AddForeignKey
ALTER TABLE `Token` ADD CONSTRAINT `Token_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
