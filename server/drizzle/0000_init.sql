CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"module" text NOT NULL,
	"reference" text NOT NULL,
	"title" text NOT NULL,
	"maker" text NOT NULL,
	"value" text NOT NULL,
	"submitted" timestamp with time zone NOT NULL,
	"level" text NOT NULL,
	"approver_role_id" text,
	"status" text NOT NULL,
	"evidence" text[] DEFAULT '{}'::text[] NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"ownership" text NOT NULL,
	"customer" text,
	"site" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"serial" text NOT NULL,
	"status" text NOT NULL,
	"contract_id" text,
	"custodian" text NOT NULL,
	"installed" date NOT NULL,
	"warranty_end" date,
	"next_service" date,
	"calibration_due" date,
	"project_id" text
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"actor" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"reference" text NOT NULL,
	"module" text NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "billing_advices" (
	"id" text PRIMARY KEY NOT NULL,
	"sales_order_id" text NOT NULL,
	"customer" text NOT NULL,
	"trigger" text NOT NULL,
	"value" bigint NOT NULL,
	"raised" date NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom_lines" (
	"bom_id" text NOT NULL,
	"seq" integer NOT NULL,
	"item_id" text NOT NULL,
	"item" text NOT NULL,
	"required" integer NOT NULL,
	"available" integer NOT NULL,
	"reserved" integer NOT NULL,
	"on_order" integer NOT NULL,
	"uom" text NOT NULL,
	CONSTRAINT "bom_lines_bom_id_seq_pk" PRIMARY KEY("bom_id","seq")
);
--> statement-breakpoint
CREATE TABLE "boms" (
	"id" text PRIMARY KEY NOT NULL,
	"revision" text NOT NULL,
	"name" text NOT NULL,
	"project_id" text NOT NULL,
	"status" text NOT NULL,
	"released_on" date
);
--> statement-breakpoint
CREATE TABLE "calibration_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"asset" text NOT NULL,
	"due" date NOT NULL,
	"status" text NOT NULL,
	"engineer" text NOT NULL,
	"certificate" text
);
--> statement-breakpoint
CREATE TABLE "calibration_points" (
	"job_id" text NOT NULL,
	"seq" integer NOT NULL,
	"nominal" text NOT NULL,
	"reading" text NOT NULL,
	"tolerance" text NOT NULL,
	"pass" boolean NOT NULL,
	CONSTRAINT "calibration_points_job_id_seq_pk" PRIMARY KEY("job_id","seq")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"person" text NOT NULL,
	"kind" text NOT NULL,
	"reference" text NOT NULL,
	"amount" bigint NOT NULL,
	"submitted" date NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_assets" (
	"contract_id" text NOT NULL,
	"asset_id" text NOT NULL,
	CONSTRAINT "contract_assets_contract_id_asset_id_pk" PRIMARY KEY("contract_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "customer_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"account_owner" text NOT NULL,
	"gstin" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "id_sequences" (
	"prefix" text PRIMARY KEY NOT NULL,
	"next" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"make" text NOT NULL,
	"uom" text NOT NULL,
	"warehouse" text NOT NULL,
	"bin" text NOT NULL,
	"on_hand" integer NOT NULL,
	"reserved" integer NOT NULL,
	"quarantined" integer NOT NULL,
	"on_order" integer NOT NULL,
	"reorder_level" integer NOT NULL,
	"unit_cost" bigint NOT NULL,
	"serialized" boolean NOT NULL,
	"status" text NOT NULL,
	"last_movement" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"person" text NOT NULL,
	"kind" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"days" integer NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"reference" text NOT NULL,
	"module" text NOT NULL,
	"tone" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"account" text NOT NULL,
	"vertical" text NOT NULL,
	"stage" text NOT NULL,
	"value" bigint NOT NULL,
	"probability" integer NOT NULL,
	"owner" text NOT NULL,
	"close_date" date NOT NULL,
	"next_action" text NOT NULL,
	"next_action_due" date NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_checks" (
	"run_id" text NOT NULL,
	"seq" integer NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"detail" text NOT NULL,
	CONSTRAINT "payroll_checks_run_id_seq_pk" PRIMARY KEY("run_id","seq")
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"status" text NOT NULL,
	"employees" integer NOT NULL,
	"gross" bigint NOT NULL,
	"deductions" bigint NOT NULL,
	"net" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"role" text NOT NULL,
	"department" text NOT NULL,
	"location" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"employment" text NOT NULL,
	"status" text NOT NULL,
	"assignment" text,
	"assignment_until" date,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"joined" date NOT NULL,
	"utilisation" integer DEFAULT 0 NOT NULL,
	"reports_to" text
);
--> statement-breakpoint
CREATE TABLE "po_lines" (
	"po_id" text NOT NULL,
	"seq" integer NOT NULL,
	"item" text NOT NULL,
	"ordered" integer NOT NULL,
	"received" integer NOT NULL,
	"rejected" integer NOT NULL,
	"uom" text NOT NULL,
	CONSTRAINT "po_lines_po_id_seq_pk" PRIMARY KEY("po_id","seq")
);
--> statement-breakpoint
CREATE TABLE "pr_lines" (
	"pr_id" text NOT NULL,
	"seq" integer NOT NULL,
	"item" text NOT NULL,
	"qty" integer NOT NULL,
	"uom" text NOT NULL,
	CONSTRAINT "pr_lines_pr_id_seq_pk" PRIMARY KEY("pr_id","seq")
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"revision" text NOT NULL,
	"status" text NOT NULL,
	"updated" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" text NOT NULL,
	"person_id" text NOT NULL,
	"seq" integer NOT NULL,
	CONSTRAINT "project_members_project_id_person_id_pk" PRIMARY KEY("project_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"project_id" text NOT NULL,
	"id" text NOT NULL,
	"seq" integer NOT NULL,
	"name" text NOT NULL,
	"due" date NOT NULL,
	"done" date,
	"status" text NOT NULL,
	"billable" bigint,
	"gate" text,
	CONSTRAINT "project_milestones_project_id_id_pk" PRIMARY KEY("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "project_risks" (
	"project_id" text NOT NULL,
	"id" text NOT NULL,
	"title" text NOT NULL,
	"impact" text NOT NULL,
	"owner" text NOT NULL,
	"mitigation" text NOT NULL,
	CONSTRAINT "project_risks_project_id_id_pk" PRIMARY KEY("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer" text NOT NULL,
	"site" text NOT NULL,
	"vertical" text NOT NULL,
	"manager" text NOT NULL,
	"status" text NOT NULL,
	"progress" integer NOT NULL,
	"start" date NOT NULL,
	"due" date NOT NULL,
	"sales_order" text,
	"bom" text,
	"work_order" text,
	"installed_asset" text,
	"contract_value" bigint NOT NULL,
	"budget" bigint NOT NULL,
	"committed" bigint NOT NULL,
	"incurred" bigint NOT NULL,
	"billed" bigint NOT NULL,
	"health" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor" text NOT NULL,
	"title" text NOT NULL,
	"project_id" text,
	"rfq_id" text,
	"value" bigint NOT NULL,
	"issued" date NOT NULL,
	"expected" date NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"project_id" text,
	"requester" text NOT NULL,
	"value" bigint NOT NULL,
	"need_by" date NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text,
	"customer" text NOT NULL,
	"title" text NOT NULL,
	"revision" text NOT NULL,
	"value" bigint NOT NULL,
	"valid_until" date NOT NULL,
	"status" text NOT NULL,
	"owner" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"module" text NOT NULL,
	"owner" text NOT NULL,
	"description" text NOT NULL,
	"refresh" text NOT NULL,
	"restricted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_quotes" (
	"rfq_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"vendor" text NOT NULL,
	"price" bigint NOT NULL,
	"lead_days" integer NOT NULL,
	"technical_fit" text NOT NULL,
	"warranty_months" integer NOT NULL,
	"payment_terms" text NOT NULL,
	"notes" text NOT NULL,
	CONSTRAINT "rfq_quotes_rfq_id_vendor_id_pk" PRIMARY KEY("rfq_id","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"pr_id" text NOT NULL,
	"project_id" text,
	"closes" date NOT NULL,
	"status" text NOT NULL,
	"awarded_to" text,
	"award_rationale" text
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" text NOT NULL,
	"module" text NOT NULL,
	"level" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_module_pk" PRIMARY KEY("role_id","module")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text,
	"customer" text NOT NULL,
	"title" text NOT NULL,
	"value" bigint NOT NULL,
	"billed" bigint NOT NULL,
	"booked" date NOT NULL,
	"status" text NOT NULL,
	"project_id" text,
	"owner" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer" text NOT NULL,
	"type" text NOT NULL,
	"start" date NOT NULL,
	"end_date" date NOT NULL,
	"visits_included" integer NOT NULL,
	"visits_used" integer NOT NULL,
	"response_hours" integer NOT NULL,
	"annual_value" bigint NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"asset_id" text NOT NULL,
	"asset" text NOT NULL,
	"customer" text NOT NULL,
	"site" text NOT NULL,
	"contract_id" text,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"assignee" text,
	"opened" timestamp with time zone NOT NULL,
	"sla_due" timestamp with time zone NOT NULL,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"chargeable" boolean NOT NULL,
	"resolution" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"item_id" text NOT NULL,
	"item" text NOT NULL,
	"qty" integer NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"reference" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"by" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"person_id" text,
	"role_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"city" text NOT NULL,
	"rating" real NOT NULL,
	"on_time_rate" integer NOT NULL,
	"open_pos" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order_stages" (
	"work_order_id" text NOT NULL,
	"seq" integer NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"owner" text NOT NULL,
	"done" date,
	"note" text,
	CONSTRAINT "work_order_stages_work_order_id_seq_pk" PRIMARY KEY("work_order_id","seq")
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"project_id" text NOT NULL,
	"bom_id" text NOT NULL,
	"serial" text NOT NULL,
	"due" date NOT NULL,
	"qc" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_role_id_roles_id_fk" FOREIGN KEY ("approver_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_contract_id_service_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."service_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_advices" ADD CONSTRAINT "billing_advices_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_bom_id_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."boms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boms" ADD CONSTRAINT "boms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_jobs" ADD CONSTRAINT "calibration_jobs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_points" ADD CONSTRAINT "calibration_points_job_id_calibration_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."calibration_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_assets" ADD CONSTRAINT "contract_assets_contract_id_service_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."service_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_assets" ADD CONSTRAINT "contract_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_checks" ADD CONSTRAINT "payroll_checks_run_id_payroll_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_lines" ADD CONSTRAINT "pr_lines_pr_id_purchase_requests_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_contract_id_service_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."service_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_stages" ADD CONSTRAINT "work_order_stages_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_status_idx" ON "approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approvals_ref_idx" ON "approvals" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "audit_at_idx" ON "audit_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_ref_idx" ON "audit_events" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "service_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "movements_item_idx" ON "stock_movements" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "movements_at_idx" ON "stock_movements" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));