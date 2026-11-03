CREATE TABLE "accounting_postings" (
	"key" text PRIMARY KEY NOT NULL,
	"advice" text NOT NULL,
	"party" text NOT NULL,
	"project_id" text,
	"state" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt" timestamp with time zone,
	"last_error" text,
	"amount" bigint NOT NULL,
	"posted" bigint,
	"external" text,
	"supersedes" text,
	"superseded_by" text,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exit_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"person" text NOT NULL,
	"role" text NOT NULL,
	"last_day" date NOT NULL,
	"reason" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exit_items" (
	"case_id" text NOT NULL,
	"key" text NOT NULL,
	"seq" integer NOT NULL,
	"item" text NOT NULL,
	"owner" text NOT NULL,
	"due" date NOT NULL,
	"reference" text NOT NULL,
	"rule" text NOT NULL,
	"status" text NOT NULL,
	"outcome" text,
	"done_by" text,
	"done_at" timestamp with time zone,
	CONSTRAINT "exit_items_case_id_key_pk" PRIMARY KEY("case_id","key")
);
--> statement-breakpoint
CREATE TABLE "subcontract_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"partner" text NOT NULL,
	"package" text NOT NULL,
	"po_id" text,
	"project_id" text,
	"custodian" text NOT NULL,
	"issued_on" date NOT NULL,
	"reconcile_by" date NOT NULL,
	"issued_by" text NOT NULL,
	"status" text NOT NULL,
	"partner_report" text
);
--> statement-breakpoint
CREATE TABLE "subcontract_lines" (
	"issue_id" text NOT NULL,
	"seq" integer NOT NULL,
	"item_id" text NOT NULL,
	"item" text NOT NULL,
	"issued" integer NOT NULL,
	"consumed" integer NOT NULL,
	"returned" integer NOT NULL,
	"damaged" integer NOT NULL,
	"unit_value" bigint NOT NULL,
	"note" text NOT NULL,
	CONSTRAINT "subcontract_lines_issue_id_seq_pk" PRIMARY KEY("issue_id","seq")
);
--> statement-breakpoint
ALTER TABLE "exit_cases" ADD CONSTRAINT "exit_cases_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_items" ADD CONSTRAINT "exit_items_case_id_exit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."exit_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontract_lines" ADD CONSTRAINT "subcontract_lines_issue_id_subcontract_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."subcontract_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontract_lines" ADD CONSTRAINT "subcontract_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;