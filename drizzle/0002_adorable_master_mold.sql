ALTER TABLE `analysisResults` DROP FOREIGN KEY `analysisResults_sessionId_sessions_id_fk`;
--> statement-breakpoint
ALTER TABLE `files` DROP FOREIGN KEY `files_sessionId_sessions_id_fk`;
--> statement-breakpoint
ALTER TABLE `analysisResults` MODIFY COLUMN `sessionId` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `files` MODIFY COLUMN `sessionId` bigint NOT NULL;