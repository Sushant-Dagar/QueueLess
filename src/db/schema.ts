import {
  pgTable, pgEnum, text, boolean, integer, timestamp, date, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { createId } from "../lib/id";

export const roleEnum = pgEnum("role", ["OWNER", "STAFF"]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "WAITING", "CALLED", "SERVED", "SKIPPED", "CANCELLED",
]);

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  isOpen: boolean("is_open").notNull().default(true),
  /** Fallback service time (minutes) until enough tickets are served to compute a real average. */
  defaultMinutes: integer("default_minutes").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("OWNER"),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    /** Human-friendly token number; restarts at 1 every day for each business. */
    number: integer("number").notNull(),
    serviceDate: date("service_date").notNull(),
    customerName: text("customer_name").notNull(),
    phone: text("phone"),
    /** Unguessable secret in the customer's link: lets them track or cancel without an account. */
    accessKey: text("access_key").notNull().unique(),
    status: ticketStatusEnum("status").notNull().default("WAITING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("tickets_business_day_number").on(t.businessId, t.serviceDate, t.number),
    index("tickets_business_status_created").on(t.businessId, t.status, t.createdAt),
  ],
);

export type Business = typeof businesses.$inferSelect;
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketStatus = Ticket["status"];
