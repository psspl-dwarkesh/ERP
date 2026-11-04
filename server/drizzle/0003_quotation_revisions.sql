CREATE TABLE "quotation_lines" (
	"quotation_id" text NOT NULL,
	"revision" text NOT NULL,
	"seq" integer NOT NULL,
	"description" text NOT NULL,
	"billing" text NOT NULL,
	"qty" real NOT NULL,
	"rate" bigint NOT NULL,
	CONSTRAINT "quotation_lines_quotation_id_revision_seq_pk" PRIMARY KEY("quotation_id","revision","seq"),
	CONSTRAINT "quotation_lines_positive" CHECK ("quotation_lines"."qty" > 0 and "quotation_lines"."rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "quotation_revisions" (
	"quotation_id" text NOT NULL,
	"revision" text NOT NULL,
	"value" bigint NOT NULL,
	"valid_until" date NOT NULL,
	"was_status" text NOT NULL,
	"note" text,
	"superseded_at" timestamp with time zone NOT NULL,
	"superseded_by" text NOT NULL,
	CONSTRAINT "quotation_revisions_quotation_id_revision_pk" PRIMARY KEY("quotation_id","revision")
);
--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "revision_note" text;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "customer_po" text;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "accepted_on" date;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;