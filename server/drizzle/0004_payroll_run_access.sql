ALTER TABLE "payroll_checks" ADD COLUMN "ack_by" text;--> statement-breakpoint
ALTER TABLE "payroll_checks" ADD COLUMN "ack_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payroll_checks" ADD COLUMN "ack_note" text;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "prepared_by" text;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "prepared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "approval_note" text;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "joining" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_by" text;