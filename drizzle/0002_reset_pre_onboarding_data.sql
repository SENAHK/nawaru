-- Removes the provisional athlete profile ("Me") and the logs created with it
-- before onboarding existed, so that onboarding runs on the next launch.
-- The seeded library, coach and demo program are kept.
DELETE FROM `active_timer`;--> statement-breakpoint
DELETE FROM `reference`;--> statement-breakpoint
DELETE FROM `set_log`;--> statement-breakpoint
DELETE FROM `exercise_log`;--> statement-breakpoint
DELETE FROM `workout`;--> statement-breakpoint
DELETE FROM `scheduled_session`;--> statement-breakpoint
DELETE FROM `enrollment`;--> statement-breakpoint
DELETE FROM `exercise_favorite`;--> statement-breakpoint
DELETE FROM `coach_athlete`;--> statement-breakpoint
UPDATE `program` SET `athlete_id` = NULL;--> statement-breakpoint
DELETE FROM `user_profile` WHERE `is_coach` = 0;
