-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 19, 2026 at 10:20 PM
-- Server version: 10.11.19-MariaDB-cll-lve
-- PHP Version: 8.4.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `jmatecsy_psrs_eCitizen`
--

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

CREATE TABLE `requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `category` varchar(50) NOT NULL,
  `location` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `status` enum('Pending','In Progress','Resolved') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `requests`
--

INSERT INTO `requests` (`id`, `user_id`, `category`, `location`, `description`, `image_path`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 'Streetlight', 'Kenyatta Avenue, near Total Petrol Station', 'Streetlight has been out for a week; the road is very dark at night.', NULL, 'Pending', '2026-10-11 13:08:41', '2026-10-11 13:08:41'),
(2, 2, 'Water Issue', 'Mirema Drive, Block C', 'No running water for three days and the pipe outside is leaking.', NULL, 'In Progress', '2026-10-12 13:08:41', '2026-10-13 13:08:41'),
(3, 2, 'Garbage Collection', 'Githurai 45 Market', 'Garbage has not been collected for two weeks and is overflowing.', NULL, 'Resolved', '2026-10-13 13:08:41', '2026-10-15 13:08:41'),
(4, 2, 'Road Damage', 'Thika Road, Roysambu exit', 'Large pothole causing traffic and damaging vehicles.', NULL, 'In Progress', '2026-10-14 13:08:41', '2026-10-15 13:08:41'),
(5, 2, 'Drainage & Sewer', 'Kasarani Estate, Lane 4', 'Blocked drain floods the lane whenever it rains.', NULL, 'Resolved', '2026-10-15 13:08:41', '2026-10-19 14:00:33'),
(6, 2, 'Streetlight', 'Ngong Road, near Prestige Plaza', 'Two streetlights flicker constantly.', NULL, 'Resolved', '2026-10-16 13:08:41', '2026-10-17 01:08:41');

-- --------------------------------------------------------

--
-- Table structure for table `status_history`
--

CREATE TABLE `status_history` (
  `id` int(10) UNSIGNED NOT NULL,
  `request_id` int(10) UNSIGNED NOT NULL,
  `status` enum('Pending','In Progress','Resolved') NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `changed_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `status_history`
--

INSERT INTO `status_history` (`id`, `request_id`, `status`, `note`, `changed_by`, `created_at`) VALUES
(1, 1, 'Pending', 'Request submitted', 2, '2026-10-11 13:08:41'),
(2, 2, 'Pending', 'Request submitted', 2, '2026-10-12 13:08:41'),
(3, 2, 'In Progress', 'Plumbing crew assigned', 1, '2026-10-13 13:08:41'),
(4, 3, 'Pending', 'Request submitted', 2, '2026-10-13 13:08:41'),
(5, 3, 'In Progress', 'Collection truck scheduled', 1, '2026-10-14 13:08:41'),
(6, 3, 'Resolved', 'Garbage cleared and bins emptied', 1, '2026-10-15 13:08:41'),
(7, 4, 'Pending', 'Request submitted', 2, '2026-10-14 13:08:41'),
(8, 4, 'In Progress', 'Road works team notified', 1, '2026-10-15 13:08:41'),
(9, 5, 'Pending', 'Request submitted', 2, '2026-10-15 13:08:41'),
(10, 6, 'Pending', 'Request submitted', 2, '2026-10-16 13:08:41'),
(11, 6, 'In Progress', 'Electrician dispatched', 1, '2026-10-16 19:08:41'),
(12, 6, 'Resolved', 'Faulty bulbs replaced', 1, '2026-10-17 01:08:41'),
(13, 5, 'In Progress', 'Status changed to In Progress', 1, '2026-10-18 21:27:35'),
(17, 5, 'Pending', 'Status changed to Pending', 1, '2026-10-19 13:48:41'),
(18, 5, 'In Progress', 'Status changed to In Progress', 1, '2026-10-19 13:55:48'),
(19, 5, 'Resolved', 'Status changed to Resolved', 1, '2026-10-19 13:56:47'),
(20, 5, 'In Progress', 'Status changed to In Progress', 1, '2026-10-19 13:56:55'),
(21, 5, 'Resolved', 'Status changed to Resolved', 1, '2026-10-19 13:57:15'),
(22, 5, 'Pending', 'Status changed to Pending', 1, '2026-10-19 13:57:40'),
(23, 5, 'Resolved', 'Status changed to Resolved', 1, '2026-10-19 14:00:33');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('citizen','admin') NOT NULL DEFAULT 'citizen',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `created_at`) VALUES
(1, 'Admin Officer', 'admin@example.com', '+254703816487', '$2a$10$brHmKpQS1j6N.7tSs9J5F.kHTaMKwaYD3UTao.0FFRG85tPIwV6by', 'admin', '2026-10-17 16:08:41'),
(2, 'Bryan Giitwa', 'devbryancoder@gmail.com', '+254703816487', '$2a$10$gehFJvZx9/rwM44V9Hdqxuwn1QLDVSfqK45mT5ZjxQW5BWGzP2ws6', 'citizen', '2026-10-17 16:08:41');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_requests_user` (`user_id`,`created_at`),
  ADD KEY `idx_requests_status_date` (`status`,`created_at`),
  ADD KEY `idx_requests_category` (`category`);

--
-- Indexes for table `status_history`
--
ALTER TABLE `status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_history_request` (`request_id`,`id`),
  ADD KEY `fk_history_user` (`changed_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `requests`
--
ALTER TABLE `requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `status_history`
--
ALTER TABLE `status_history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `requests`
--
ALTER TABLE `requests`
  ADD CONSTRAINT `fk_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `status_history`
--
ALTER TABLE `status_history`
  ADD CONSTRAINT `fk_history_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
