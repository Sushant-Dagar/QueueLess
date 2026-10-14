/**
 * Creates the public demo queue (/q/demo-clinic) with a staff login and a few customers in line.
 * Safe to run more than once.
 *   Staff login: demo@queueless.app / demo1234
 */
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, pool } from "./index";
import { businesses, users } from "./schema";
import { callNext, joinQueue } from "../lib/tickets";

async function main() {
  let [biz] = await db.select().from(businesses).where(eq(businesses.slug, "demo-clinic"));
  if (!biz) {
    [biz] = await db
      .insert(businesses)
      .values({ name: "Sharma Clinic (Demo)", slug: "demo-clinic", category: "Clinic", defaultMinutes: 6 })
      .returning();
    await db.insert(users).values({
      name: "Demo Receptionist",
      email: "demo@queueless.app",
      passwordHash: await bcrypt.hash("demo1234", 12),
      role: "OWNER",
      businessId: biz.id,
    });
    for (const name of ["Anita", "Rohit", "Fatima", "Gurpreet", "Arjun"]) {
      await joinQueue(db, biz.id, { customerName: name });
    }
    await callNext(db, biz.id);
    console.log("Seeded demo queue at /q/demo-clinic (login: demo@queueless.app / demo1234)");
  } else {
    console.log("Demo queue already exists");
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
