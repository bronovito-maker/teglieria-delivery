import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variabile obbligatoria assente: ${name}`);
  return value;
}

function flag(name) {
  if (required(name) !== "1") throw new Error(`${name} deve valere 1`);
}

const environment = required("RELEASE_ENVIRONMENT");
if (environment !== "staging" && environment !== "production") {
  throw new Error("RELEASE_ENVIRONMENT deve essere staging o production");
}

const candidateSha = required("RELEASE_CANDIDATE_SHA");
const headSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (candidateSha !== headSha) {
  throw new Error(`SHA candidata diversa da HEAD: candidata=${candidateSha}, HEAD=${headSha}`);
}

const trackedChanges = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim();
if (trackedChanges) throw new Error("La working tree contiene modifiche tracciate non incluse nella commit candidata");

const siteUrl = new URL(required("RELEASE_SITE_URL"));
const canonicalProductionUrl = new URL(required("NEXT_PUBLIC_SITE_URL"));
const productionHosts = new Set(["lateglieria.it", "www.lateglieria.it"]);
if (environment === "staging") {
  flag("RELEASE_CONFIRM_ISOLATED_STAGING");
  if (productionHosts.has(siteUrl.hostname.toLowerCase()) || siteUrl.origin === canonicalProductionUrl.origin) {
    throw new Error("Lo staging non può usare l'host di produzione");
  }
} else {
  flag("RELEASE_PRODUCTION_APPROVED");
  flag("RELEASE_LOW_TRAFFIC_WINDOW");
  if (siteUrl.origin !== canonicalProductionUrl.origin) {
    throw new Error("RELEASE_SITE_URL non coincide con NEXT_PUBLIC_SITE_URL di produzione");
  }
}

flag("RELEASE_CONFIRM_PITR");
flag("RELEASE_CONFIRM_DATABASE_IDENTITY");
const pitrEvidence = required("RELEASE_PITR_EVIDENCE");
const rollbackDeployment = required("RELEASE_ROLLBACK_DEPLOYMENT");
const databaseUrl = new URL(required("DATABASE_URL"));

for (const asset of [
  "public/menu/bevanda_acqua_valmora_15l.jpg",
  "public/menu/bevanda_birra_theresianer_lager.webp",
  "public/menu/bevanda_birra_theresianer_vienna_rossa.jpg",
  "public/menu/bevanda_birra_theresianer.jpg",
]) {
  if (!existsSync(asset)) throw new Error(`Asset di rilascio/rollback assente: ${asset}`);
}

console.log(`Preflight ${environment} superato`);
console.log(`Commit candidata: ${headSha}`);
console.log(`Applicazione: ${siteUrl.origin}`);
console.log(`Database host: ${databaseUrl.hostname}`);
console.log(`PITR/backup: ${pitrEvidence}`);
console.log(`Rollback deploy: ${rollbackDeployment}`);
