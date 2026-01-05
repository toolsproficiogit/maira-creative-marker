CREATE TABLE `analysisResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`sessionId` int NOT NULL,
	`focus` enum('branding','performance') NOT NULL,
	`filetype` enum('image','video') NOT NULL,
	`analysisJson` text NOT NULL,
	`bigqueryTable` varchar(256),
	`retryCount` int NOT NULL DEFAULT 0,
	`validationError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`fileKey` varchar(1024) NOT NULL,
	`fileUrl` text NOT NULL,
	`filetype` enum('image','video') NOT NULL,
	`mimeType` varchar(128),
	`fileSize` int,
	`brand` text NOT NULL,
	`targetAudience` text NOT NULL,
	`category` text NOT NULL,
	`primaryMessage` text NOT NULL,
	`secondaryMessage1` text NOT NULL,
	`secondaryMessage2` text NOT NULL,
	`version` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analysisResults` ADD CONSTRAINT `analysisResults_fileId_files_id_fk` FOREIGN KEY (`fileId`) REFERENCES `files`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analysisResults` ADD CONSTRAINT `analysisResults_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;