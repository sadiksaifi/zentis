CREATE TABLE `board` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT 'Untitled' NOT NULL,
	`elements` text DEFAULT '[]' NOT NULL,
	`app_state` text DEFAULT '{}' NOT NULL,
	`files` text,
	`thumbnail_data_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `board_userId_idx` ON `board` (`user_id`);