CREATE TABLE `active_timer` (
	`id` integer PRIMARY KEY NOT NULL,
	`exercise_log_id` text NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`exercise_log_id`) REFERENCES `exercise_log`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `coach_athlete` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`coach_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`logs_visible` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`coach_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`athlete_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "coach_athlete_status_check" CHECK("coach_athlete"."status" in ('active', 'ended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_athlete_unique` ON `coach_athlete` (`coach_id`,`athlete_id`);--> statement-breakpoint
CREATE TABLE `enrollment` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`athlete_id` text NOT NULL,
	`program_id` text NOT NULL,
	`start_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`paused_at` text,
	`color` text,
	FOREIGN KEY (`athlete_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enrollment_status_check" CHECK("enrollment"."status" in ('active', 'paused', 'completed', 'archived'))
);
--> statement-breakpoint
CREATE INDEX `enrollment_athlete_idx` ON `enrollment` (`athlete_id`,`status`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_slug_unique` ON `equipment` (`slug`);--> statement-breakpoint
CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`dosage_scheme` text NOT NULL,
	`default_effort_scale` text NOT NULL,
	`unilateral_allowed` integer DEFAULT false NOT NULL,
	`is_testable` integer DEFAULT false NOT NULL,
	CONSTRAINT "exercise_category_check" CHECK("exercise"."category" in ('fingers', 'strength', 'climbing', 'mobility', 'conditioning', 'warmup')),
	CONSTRAINT "exercise_dosage_scheme_check" CHECK("exercise"."dosage_scheme" in ('reps', 'isometric', 'intervals', 'circuit', 'slots', 'free_duration')),
	CONSTRAINT "exercise_effort_scale_check" CHECK("exercise"."default_effort_scale" in ('rpe', 'rir', 'feel'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_slug_unique` ON `exercise` (`slug`);--> statement-breakpoint
CREATE TABLE `exercise_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`exercise_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_equipment_unique` ON `exercise_equipment` (`exercise_id`,`equipment_id`);--> statement-breakpoint
CREATE INDEX `exercise_equipment_equipment_idx` ON `exercise_equipment` (`equipment_id`);--> statement-breakpoint
CREATE TABLE `exercise_favorite` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_favorite_unique` ON `exercise_favorite` (`user_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercise_log` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`prescription_id` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`grip_type` text,
	`finger_count` text,
	`side` text,
	`edge_mm` integer,
	`support_label` text,
	`effort_scale` text,
	`effort_value` real,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prescription_id`) REFERENCES `prescription`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exercise_log_grip_type_check" CHECK("exercise_log"."grip_type" in ('half_crimp', 'full_crimp', 'open_drag', 'pocket', 'pinch', 'sloper')),
	CONSTRAINT "exercise_log_finger_count_check" CHECK("exercise_log"."finger_count" in ('four', 'three_front', 'three_back', 'two_front', 'two_middle', 'two_back', 'mono')),
	CONSTRAINT "exercise_log_side_check" CHECK("exercise_log"."side" in ('both', 'left', 'right', 'alternate')),
	CONSTRAINT "exercise_log_effort_scale_check" CHECK("exercise_log"."effort_scale" in ('rpe', 'rir', 'feel'))
);
--> statement-breakpoint
CREATE INDEX `exercise_log_workout_idx` ON `exercise_log` (`workout_id`,`sort`);--> statement-breakpoint
CREATE INDEX `exercise_log_exercise_idx` ON `exercise_log` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercise_measure` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`exercise_id` text NOT NULL,
	`measure` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exercise_measure_check" CHECK("exercise_measure"."measure" in ('load', 'grip', 'edge', 'grade', 'tempo', 'range', 'effort', 'result'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_measure_unique` ON `exercise_measure` (`exercise_id`,`measure`);--> statement-breakpoint
CREATE TABLE `exercise_media` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`exercise_id` text NOT NULL,
	`kind` text NOT NULL,
	`uri` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exercise_media_kind_check" CHECK("exercise_media"."kind" in ('video', 'image'))
);
--> statement-breakpoint
CREATE INDEX `exercise_media_exercise_idx` ON `exercise_media` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercise_muscle` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`exercise_id` text NOT NULL,
	`muscle_id` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`muscle_id`) REFERENCES `muscle`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exercise_muscle_role_check" CHECK("exercise_muscle"."role" in ('primary', 'secondary'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_muscle_unique` ON `exercise_muscle` (`exercise_id`,`muscle_id`);--> statement-breakpoint
CREATE INDEX `exercise_muscle_muscle_idx` ON `exercise_muscle` (`muscle_id`);--> statement-breakpoint
CREATE TABLE `muscle` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`body_region` text NOT NULL,
	CONSTRAINT "muscle_body_region_check" CHECK("muscle"."body_region" in ('arms', 'shoulders', 'back', 'chest', 'core', 'legs'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `muscle_slug_unique` ON `muscle` (`slug`);--> statement-breakpoint
CREATE TABLE `planned_session` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`program_id` text NOT NULL,
	`week_index` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`name` text,
	`is_test` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "planned_session_week_check" CHECK("planned_session"."week_index" >= 1),
	CONSTRAINT "planned_session_day_check" CHECK("planned_session"."day_of_week" between 1 and 7)
);
--> statement-breakpoint
CREATE INDEX `planned_session_program_idx` ON `planned_session` (`program_id`,`week_index`,`day_of_week`);--> statement-breakpoint
CREATE TABLE `prescription` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`planned_session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`sets` integer,
	`reps` integer,
	`duration_s` integer,
	`on_s` integer,
	`off_s` integer,
	`rest_between_sets_s` integer,
	`rounds` integer,
	`items_per_round` integer,
	`slot_duration_s` integer,
	`total_duration_s` integer,
	`load_mode` text DEFAULT 'none' NOT NULL,
	`load_value` real,
	`grip_type` text,
	`finger_count` text,
	`side` text,
	`edge_mm` integer,
	`support_label` text,
	`tempo` text,
	`target_grade` text,
	`target_effort` real,
	`effort_scale` text NOT NULL,
	`is_test` integer DEFAULT false NOT NULL,
	`progression_rule_id` text,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`planned_session_id`) REFERENCES `planned_session`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`progression_rule_id`) REFERENCES `progression_rule`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "prescription_load_mode_check" CHECK("prescription"."load_mode" in ('none', 'absolute', 'added', 'assisted', 'percent_reference')),
	CONSTRAINT "prescription_grip_type_check" CHECK("prescription"."grip_type" in ('half_crimp', 'full_crimp', 'open_drag', 'pocket', 'pinch', 'sloper')),
	CONSTRAINT "prescription_finger_count_check" CHECK("prescription"."finger_count" in ('four', 'three_front', 'three_back', 'two_front', 'two_middle', 'two_back', 'mono')),
	CONSTRAINT "prescription_side_check" CHECK("prescription"."side" in ('both', 'left', 'right', 'alternate')),
	CONSTRAINT "prescription_effort_scale_check" CHECK("prescription"."effort_scale" in ('rpe', 'rir', 'feel'))
);
--> statement-breakpoint
CREATE INDEX `prescription_session_idx` ON `prescription` (`planned_session_id`,`sort`);--> statement-breakpoint
CREATE INDEX `prescription_exercise_idx` ON `prescription` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `program` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`owner_id` text NOT NULL,
	`athlete_id` text,
	`is_template` integer DEFAULT false NOT NULL,
	`template_id` text,
	`template_version` integer,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`duration_days` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`athlete_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `program_owner_idx` ON `program` (`owner_id`);--> statement-breakpoint
CREATE INDEX `program_athlete_idx` ON `program` (`athlete_id`);--> statement-breakpoint
CREATE TABLE `program_phase` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`program_id` text NOT NULL,
	`name` text NOT NULL,
	`start_week` integer NOT NULL,
	`end_week` integer NOT NULL,
	`is_test` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "program_phase_weeks_check" CHECK("program_phase"."start_week" >= 1 and "program_phase"."end_week" >= "program_phase"."start_week")
);
--> statement-breakpoint
CREATE INDEX `program_phase_program_idx` ON `program_phase` (`program_id`);--> statement-breakpoint
CREATE TABLE `progression_rule` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`program_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "progression_rule_kind_check" CHECK("progression_rule"."kind" in ('add_load_per_week', 'add_percent_per_week', 'percent_of_reference'))
);
--> statement-breakpoint
CREATE TABLE `reference` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`athlete_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`grip_type` text,
	`finger_count` text,
	`side` text,
	`edge_mm` integer,
	`duration_s` integer,
	`value_kg` real NOT NULL,
	`measured_on` text NOT NULL,
	`source_set_log_id` text,
	FOREIGN KEY (`athlete_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_set_log_id`) REFERENCES `set_log`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reference_grip_type_check" CHECK("reference"."grip_type" in ('half_crimp', 'full_crimp', 'open_drag', 'pocket', 'pinch', 'sloper')),
	CONSTRAINT "reference_finger_count_check" CHECK("reference"."finger_count" in ('four', 'three_front', 'three_back', 'two_front', 'two_middle', 'two_back', 'mono')),
	CONSTRAINT "reference_side_check" CHECK("reference"."side" in ('both', 'left', 'right', 'alternate'))
);
--> statement-breakpoint
CREATE INDEX `reference_lookup_idx` ON `reference` (`athlete_id`,`exercise_id`,`measured_on`);--> statement-breakpoint
CREATE TABLE `scheduled_session` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`enrollment_id` text NOT NULL,
	`planned_session_id` text NOT NULL,
	`scheduled_date` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`planned_session_id`) REFERENCES `planned_session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scheduled_session_date_idx` ON `scheduled_session` (`scheduled_date`);--> statement-breakpoint
CREATE INDEX `scheduled_session_enrollment_idx` ON `scheduled_session` (`enrollment_id`);--> statement-breakpoint
CREATE TABLE `set_log` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`exercise_log_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`round_index` integer,
	`item_index` integer,
	`side` text,
	`reps_done` integer,
	`duration_s` integer,
	`load_kg` real,
	`grade` text,
	`grade_system` text,
	`result` text DEFAULT 'success' NOT NULL,
	`effort_value` real,
	FOREIGN KEY (`exercise_log_id`) REFERENCES `exercise_log`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "set_log_side_check" CHECK("set_log"."side" in ('left', 'right')),
	CONSTRAINT "set_log_result_check" CHECK("set_log"."result" in ('success', 'fail'))
);
--> statement-breakpoint
CREATE INDEX `set_log_exercise_log_idx` ON `set_log` (`exercise_log_id`,`set_index`);--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`display_name` text NOT NULL,
	`is_coach` integer DEFAULT false NOT NULL,
	`bodyweight_kg` real,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`boulder_grade_system` text DEFAULT 'font' NOT NULL,
	`route_grade_system` text DEFAULT 'french' NOT NULL,
	`prep_countdown_s` integer DEFAULT 10 NOT NULL,
	`side_switch_rest_s` integer DEFAULT 10 NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`timer_sounds_enabled` integer DEFAULT true NOT NULL,
	`timer_volume` integer DEFAULT 100 NOT NULL,
	`haptics_enabled` integer DEFAULT true NOT NULL,
	CONSTRAINT "user_profile_weight_unit_check" CHECK("user_profile"."weight_unit" in ('kg', 'lbs')),
	CONSTRAINT "user_profile_boulder_grades_check" CHECK("user_profile"."boulder_grade_system" in ('font', 'v_scale')),
	CONSTRAINT "user_profile_route_grades_check" CHECK("user_profile"."route_grade_system" in ('french', 'yds')),
	CONSTRAINT "user_profile_theme_check" CHECK("user_profile"."theme" in ('dark', 'light', 'system')),
	CONSTRAINT "user_profile_timer_volume_check" CHECK("user_profile"."timer_volume" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE `workout` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`athlete_id` text NOT NULL,
	`scheduled_session_id` text,
	`performed_on` text NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`athlete_id`) REFERENCES `user_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scheduled_session_id`) REFERENCES `scheduled_session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_scheduled_session_id_unique` ON `workout` (`scheduled_session_id`);--> statement-breakpoint
CREATE INDEX `workout_performed_on_idx` ON `workout` (`athlete_id`,`performed_on`);