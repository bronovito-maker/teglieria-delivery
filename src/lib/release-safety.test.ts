import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const candidateMigrations = [
  "20260910234500_add_order_item_ingredient_snapshot",
  "20260910235900_add_authoritative_club_savings",
  "20260911001000_add_order_auth_user_id_index",
  "20260914093000_add_order_cancellation_outbox_and_audit",
];

describe("release safety", () => {
  it.each(candidateMigrations)("mantiene additiva la migrazione %s", (migration) => {
    const sql = readFileSync(join(process.cwd(), "prisma", "migrations", migration, "migration.sql"), "utf8");
    expect(sql).not.toMatch(/\b(?:DROP|DELETE|TRUNCATE)\b/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE[\s\S]*?\bDROP\b/i);
    expect(sql).toMatch(/\b(?:ADD\s+COLUMN|CREATE\s+(?:TABLE|INDEX|UNIQUE\s+INDEX))\b/i);
  });

  it("mantiene disponibili insieme asset nuovi e immagine legacy durante il rollback", () => {
    for (const asset of [
      "bevanda_acqua_valmora_15l.jpg",
      "bevanda_birra_theresianer_lager.webp",
      "bevanda_birra_theresianer_vienna_rossa.jpg",
      "bevanda_birra_theresianer.jpg",
    ]) {
      expect(existsSync(join(process.cwd(), "public", "menu", asset)), asset).toBe(true);
    }
  });
});
