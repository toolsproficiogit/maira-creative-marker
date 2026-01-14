CREATE TABLE `promptVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptId` int NOT NULL,
	`version` int NOT NULL,
	`content` text NOT NULL,
	`changeDescription` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptType` enum('system','output') NOT NULL,
	`filetype` enum('image','video') NOT NULL,
	`focus` enum('branding','performance') NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`isDefault` tinyint NOT NULL DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `promptVersions` ADD CONSTRAINT `promptVersions_promptId_prompts_id_fk` FOREIGN KEY (`promptId`) REFERENCES `prompts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promptVersions` ADD CONSTRAINT `promptVersions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prompts` ADD CONSTRAINT `prompts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;