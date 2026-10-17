-- =====================================================================
--  Huduma Hub — Public Service Request System
--  MySQL 5.7+ / 8.x and MariaDB 10.3+ (works with XAMPP / WAMP / MAMP)
--
--  HOW TO IMPORT (phpMyAdmin)
--    1. Open phpMyAdmin  ->  "Import" tab
--    2. Choose this file (database/schema.sql)  ->  Go
--  The script creates the `psrs` database, so no need to create it first.
--
--  WARNING: the DROP TABLE statements below make the import repeatable
--  but DELETE existing data in these tables. Remove them to keep data.
--
--  Demo logins created at the bottom:
--    admin@example.com   / Admin123!
--    citizen@example.com / Citizen123!
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `psrs`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `psrs`;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `status_history`;
DROP TABLE IF EXISTS `requests`;
DROP TABLE IF EXISTS `users`;

-- ---------------------------------------------------------------------
--  users: citizens and administrators
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(100) NOT NULL,
  `email`         VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('citizen', 'admin') NOT NULL DEFAULT 'citizen',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  requests: service requests submitted by citizens
-- ---------------------------------------------------------------------
CREATE TABLE `requests` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED NOT NULL,
  `category`    VARCHAR(50)  NOT NULL,
  `location`    VARCHAR(255) NOT NULL,
  `description` TEXT         NOT NULL,
  `image_path`  VARCHAR(255) DEFAULT NULL,
  `status`      ENUM('Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Pending',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_requests_user`          (`user_id`, `created_at`),
  KEY `idx_requests_status_date`   (`status`, `created_at`),
  KEY `idx_requests_category`      (`category`),
  CONSTRAINT `fk_requests_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  status_history: audit trail shown as the progress timeline
-- ---------------------------------------------------------------------
CREATE TABLE `status_history` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` INT UNSIGNED NOT NULL,
  `status`     ENUM('Pending', 'In Progress', 'Resolved') NOT NULL,
  `note`       VARCHAR(500) DEFAULT NULL,
  `changed_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_history_request` (`request_id`, `id`),
  CONSTRAINT `fk_history_request`
    FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_history_user`
    FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  DEMO DATA (optional — delete everything below for an empty database)
--  Times are stored in UTC, matching the API's session time zone.
-- =====================================================================

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`) VALUES
  (1, 'Admin Officer',  'admin@example.com',
      '$2a$10$brHmKpQS1j6N.7tSs9J5F.kHTaMKwaYD3UTao.0FFRG85tPIwV6by', 'admin'),
  (2, 'Amina Wanjiru',  'citizen@example.com',
      '$2a$10$gehFJvZx9/rwM44V9Hdqxuwn1QLDVSfqK45mT5ZjxQW5BWGzP2ws6', 'citizen');

INSERT INTO `requests` (`id`, `user_id`, `category`, `location`, `description`, `status`, `created_at`, `updated_at`) VALUES
  (1, 2, 'Streetlight',        'Kenyatta Avenue, near Total Petrol Station',
      'Streetlight has been out for a week; the road is very dark at night.',
      'Pending',     DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
  (2, 2, 'Water Issue',        'Mirema Drive, Block C',
      'No running water for three days and the pipe outside is leaking.',
      'In Progress', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
  (3, 2, 'Garbage Collection', 'Githurai 45 Market',
      'Garbage has not been collected for two weeks and is overflowing.',
      'Resolved',    DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
  (4, 2, 'Road Damage',        'Thika Road, Roysambu exit',
      'Large pothole causing traffic and damaging vehicles.',
      'In Progress', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
  (5, 2, 'Drainage & Sewer',   'Kasarani Estate, Lane 4',
      'Blocked drain floods the lane whenever it rains.',
      'Pending',     DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
  (6, 2, 'Streetlight',        'Ngong Road, near Prestige Plaza',
      'Two streetlights flicker constantly.',
      'Resolved',    DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR));

INSERT INTO `status_history` (`request_id`, `status`, `note`, `changed_by`, `created_at`) VALUES
  (1, 'Pending',     'Request submitted',    2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
  (2, 'Pending',     'Request submitted',    2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
  (2, 'In Progress', 'Plumbing crew assigned', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
  (3, 'Pending',     'Request submitted',    2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
  (3, 'In Progress', 'Collection truck scheduled', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
  (3, 'Resolved',    'Garbage cleared and bins emptied', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
  (4, 'Pending',     'Request submitted',    2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
  (4, 'In Progress', 'Road works team notified', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
  (5, 'Pending',     'Request submitted',    2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
  (6, 'Pending',     'Request submitted',    2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
  (6, 'In Progress', 'Electrician dispatched', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
  (6, 'Resolved',    'Faulty bulbs replaced', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR));
