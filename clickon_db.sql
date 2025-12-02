-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 02 Des 2025 pada 15.22
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `clickon_db`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `event_date` datetime DEFAULT NULL,
  `image_url` longtext DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 100000.00,
  `default_category` varchar(100) NOT NULL DEFAULT 'FESTIVAL',
  `status` enum('available','sold_out') DEFAULT 'available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `venue`, `event_date`, `image_url`, `price`, `default_category`, `status`) VALUES
(1, 'Konser \"Melodi Senja\" - Artis A', 'Deskripsi konser...', 'Stadion XYZ, Yogyakarta', '2025-12-25 19:00:00', NULL, 750000.00, 'FESTIVAL', 'available'),
(2, 'Tur \"Gema\" - Band B', 'Deskripsi tur...', 'Lapangan Merdeka, Jakarta', '2025-12-30 20:00:00', NULL, 550000.00, 'FESTIVAL', 'available'),
(3, 'Konser Amal \"Satu Nada\"', 'Deskripsi konser...', 'Gedung Opera, Surabaya', '2026-01-15 19:30:00', NULL, 350000.00, 'FESTIVAL', 'available'),
(4, 'Konser Kemerdekaan', '123', 'Yogyakarta', '2025-01-20 02:02:00', NULL, 150000.00, 'FESTIVAL', 'available'),
(15, 'Konser Mantap', '', 'Yogyakarta', '2025-01-02 20:00:00', NULL, 250000.00, 'FESTIVAL', 'available');

-- --------------------------------------------------------

--
-- Struktur dari tabel `merchandise`
--

CREATE TABLE `merchandise` (
  `id` int(11) NOT NULL,
  `event_id` int(11) DEFAULT NULL,
  `item_name` varchar(255) NOT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  `image_url` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `merchandise_transactions`
--

CREATE TABLE `merchandise_transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `merchandise_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `transaction_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `tickets`
--

CREATE TABLE `tickets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `ticket_code` varchar(100) NOT NULL,
  `purchase_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('paid','unpaid','used') DEFAULT 'unpaid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tickets`
--

INSERT INTO `tickets` (`id`, `user_id`, `event_id`, `ticket_code`, `purchase_date`, `status`) VALUES
(1, 1, 1, 'CKT-1-1-1762830098689', '2025-11-11 03:01:38', 'paid'),
(2, 2, 1, 'CKT-2-1-1762832727130', '2025-11-11 03:45:27', 'used'),
(3, 1, 1, 'CKT-1-1-1764641114925', '2025-12-02 02:05:14', 'used'),
(4, 1, 1, 'CKT-1-1-1764641506687', '2025-12-02 02:11:46', 'used'),
(5, 1, 2, 'CKT-1-2-1764641923968', '2025-12-02 02:18:43', 'paid'),
(6, 1, 4, 'CKT-1-4-1764642687478', '2025-12-02 02:31:27', 'used'),
(7, 1, 3, 'CKT-1-3-1764644081447', '2025-12-02 02:54:41', 'paid'),
(11, 1, 15, 'CKT-1-15-1764682345303', '2025-12-02 13:32:25', 'paid'),
(12, 1, 4, 'CKT-1-4-1764682360901', '2025-12-02 13:32:40', 'paid'),
(13, 1, 2, 'CKT-1-2-1764682663718', '2025-12-02 13:37:43', 'paid'),
(14, 1, 15, 'CKT-1-15-1764682912621', '2025-12-02 13:41:52', 'paid'),
(15, 1, 15, 'CKT-1-15-1764683330575', '2025-12-02 13:48:50', 'paid'),
(16, 1, 4, 'CKT-1-4-1764683718878', '2025-12-02 13:55:18', 'paid'),
(17, 1, 4, 'CKT-1-4-1764684743135', '2025-12-02 14:12:23', 'paid');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `role` enum('penonton','admin','panitia') DEFAULT 'penonton',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `created_at`) VALUES
(1, 'bagas@gmail.com', '$2b$10$oV2I9Dg.W2gpOQqn6U4Qh.qlmyzaZikdjlsv.MQJ0h12l8s36F5Ou', 'bagas', 'penonton', '2025-11-11 02:52:40'),
(2, 'galih123@gmail.com', '$2b$10$XiSartxkPG2C18pkCeLuZ.dKWQeRFazJkrvFqo.Xtoxz8.Vd6DoOa', 'Galih', 'penonton', '2025-11-11 03:44:27'),
(3, 'tes3@gmail.com', '$2b$10$z5y36nKuMRACKmKVVRggTe8xuGKlhbFnOw3wbz4DJDIAbHeO0g.JO', 'tes', 'penonton', '2025-12-02 00:47:10'),
(4, 'admin@email.com', '$2b$10$oMTJS81wJaFSFv4YmzHfmu3B0ZogPkQjZ2gRpi/.YVoU7NfFoqiL6', 'admin', 'admin', '2025-12-02 01:46:32');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `merchandise`
--
ALTER TABLE `merchandise`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indeks untuk tabel `merchandise_transactions`
--
ALTER TABLE `merchandise_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `merchandise_id` (`merchandise_id`);

--
-- Indeks untuk tabel `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ticket_code` (`ticket_code`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT untuk tabel `merchandise`
--
ALTER TABLE `merchandise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `merchandise_transactions`
--
ALTER TABLE `merchandise_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `merchandise`
--
ALTER TABLE `merchandise`
  ADD CONSTRAINT `merchandise_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`);

--
-- Ketidakleluasaan untuk tabel `merchandise_transactions`
--
ALTER TABLE `merchandise_transactions`
  ADD CONSTRAINT `merchandise_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `merchandise_transactions_ibfk_2` FOREIGN KEY (`merchandise_id`) REFERENCES `merchandise` (`id`);

--
-- Ketidakleluasaan untuk tabel `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
