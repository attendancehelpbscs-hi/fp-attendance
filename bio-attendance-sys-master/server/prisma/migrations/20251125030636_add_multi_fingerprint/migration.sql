-- CreateTable
CREATE TABLE `Fingerprint` (
    `id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `fingerprint` LONGTEXT NULL,
    `fingerprint_hash` VARCHAR(64) NULL,
    `encrypted_fingerprint` LONGTEXT NULL,
    `finger_type` ENUM('thumb', 'index', 'middle', 'ring', 'pinky') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Fingerprint_student_id_idx`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Fingerprint` ADD CONSTRAINT `Fingerprint_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
