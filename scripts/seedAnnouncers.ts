/**
 * Seed Announcers Script
 *
 * This script populates Firestore with initial announcer accounts.
 * Run this once to migrate from demo accounts to Firestore.
 *
 * Usage:
 *   npx ts-node scripts/seedAnnouncers.ts
 */

// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { createAnnouncer } from "../services/announcerAuth";

const DEMO_ANNOUNCERS = [
  {
    email: "announcer1@demo.com",
    password: "pass123",
    name: "Parnia",
    role: "announcer" as const,
  },
  {
    email: "admin@demo.com",
    password: "admin123",
    name: "System Admin",
    role: "admin" as const,
  },
];

async function seedAnnouncers() {
  console.log("🌱 Starting announcer seeding...\n");

  for (const announcer of DEMO_ANNOUNCERS) {
    console.log(`Creating announcer: ${announcer.name} (${announcer.email})`);

    const result = await createAnnouncer(
      announcer.email,
      announcer.password,
      announcer.name,
      announcer.role
    );

    if (result) {
      console.log(`✅ Successfully created: ${announcer.email}`);
    } else {
      console.log(`❌ Failed to create or already exists: ${announcer.email}`);
    }
    console.log("");
  }

  console.log("✨ Seeding complete!");
  console.log("\nDemo Accounts Created:");
  console.log("━".repeat(50));
  DEMO_ANNOUNCERS.forEach((acc) => {
    console.log(`Email: ${acc.email}`);
    console.log(`Password: ${acc.password}`);
    console.log(`Role: ${acc.role}`);
    console.log("━".repeat(50));
  });
}

// Run the seeding function
seedAnnouncers()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  });
