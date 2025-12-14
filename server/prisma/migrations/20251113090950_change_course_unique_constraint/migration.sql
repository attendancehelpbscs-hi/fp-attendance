/*
  Warnings:

  - A unique constraint covering the columns `[course_code,staff_id]` on the table `Course` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Course_course_code_key` ON `course`;

-- CreateIndex
CREATE UNIQUE INDEX `Course_course_code_staff_id_key` ON `Course`(`course_code`, `staff_id`);
