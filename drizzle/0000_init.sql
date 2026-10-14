CREATE TYPE "public"."role" AS ENUM('OWNER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('WAITING', 'CALLED', 'SERVED', 'SKIPPED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"default_minutes" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"number" integer NOT NULL,
	"service_date" date NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text,
	"access_key" text NOT NULL,
	"status" "ticket_status" DEFAULT 'WAITING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "tickets_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'OWNER' NOT NULL,
	"business_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_business_day_number" ON "tickets" USING btree ("business_id","service_date","number");--> statement-breakpoint
CREATE INDEX "tickets_business_status_created" ON "tickets" USING btree ("business_id","status","created_at");