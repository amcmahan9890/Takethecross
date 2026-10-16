// Build script run by Vercel (npm run build).
// 1. Copies the site files into dist/
// 2. Writes dist/config.js from environment variables (public values only)
// 3. Copies the Supabase browser library out of node_modules into dist/vendor/
//
// Only SUPABASE_URL and SUPABASE_ANON_KEY are ever written into the site.
// Those two values are meant to be public: Row Level Security protects the data.
// NEVER put a service-role / secret key in these variables.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "dist");

const SITE_FILES = [
  "index.html",
  "styles.css",
  "theme.js",
  "app.js",
  "backend.js",
  "manifest.webmanifest",
  "favicon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "robots.txt",
];

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "vendor"), { recursive: true });

for (const f of SITE_FILES) {
  const src = join(root, f);
  if (!existsSync(src)) {
    console.error(`Build failed: missing file "${f}". Upload it to the repository root.`);
    process.exit(1);
  }
  cpSync(src, join(out, f));
}

// ---- config.js (public settings only) ----
const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_ANON_KEY || "").trim();

if (/service_role|sb_secret_/i.test(key) || (key.split(".").length === 3 && isServiceRoleJwt(key))) {
  console.error("Build failed: SUPABASE_ANON_KEY looks like a SECRET key. Use the publishable (or anon) key instead.");
  process.exit(1);
}

if (!url || !key) {
  console.warn("WARNING: SUPABASE_URL / SUPABASE_ANON_KEY are not set. The site will run in local-only mode (progress saved on each device).");
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  console.warn(`WARNING: SUPABASE_URL "${url}" does not look like https://YOUR-REF.supabase.co`);
}

writeFileSync(
  join(out, "config.js"),
  "window.TTC_CONFIG=" + JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key }) + ";\n"
);

// ---- Supabase browser library ----
try {
  const pkgDir = join(root, "node_modules", "@supabase", "supabase-js");
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  const rel = pkg.jsdelivr || pkg.unpkg || "dist/umd/supabase.js";
  const file = join(pkgDir, rel);
  if (!existsSync(file)) throw new Error(`file not found: ${rel}`);
  cpSync(file, join(out, "vendor", "supabase.js"));
  console.log(`Copied Supabase library ${pkg.version} (${rel})`);
} catch (e) {
  console.error("Build failed: could not find the Supabase library. Make sure package.json is in the repository root. " + e.message);
  process.exit(1);
}

console.log("Build complete -> dist/");

function isServiceRoleJwt(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload && payload.role === "service_role";
  } catch {
    return false;
  }
}
