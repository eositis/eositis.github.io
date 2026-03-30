#!/usr/bin/env node
/**
 * Scans gallery/megaflash/ for image files and writes manifest.json.
 * Preserves existing alt text for files that were already in the manifest.
 *
 * Usage (from repo root):
 *   node scripts/generate-megaflash-gallery-manifest.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const galleryDir = path.join(repoRoot, "gallery", "megaflash");
const manifestPath = path.join(galleryDir, "manifest.json");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function defaultAltFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadPreviousAlts() {
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const prev = JSON.parse(raw);
    const map = new Map();
    if (prev && Array.isArray(prev.items)) {
      for (const it of prev.items) {
        if (it && typeof it.file === "string") {
          map.set(it.file, typeof it.alt === "string" ? it.alt : defaultAltFromFilename(it.file));
        }
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function main() {
  if (!fs.existsSync(galleryDir)) {
    console.error("Missing directory:", galleryDir);
    process.exit(1);
  }

  const prevAlts = loadPreviousAlts();
  const names = fs
    .readdirSync(galleryDir)
    .filter((name) => {
      if (name === "manifest.json" || name.startsWith(".")) return false;
      const ext = path.extname(name).toLowerCase();
      return IMAGE_EXT.has(ext);
    })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const items = names.map((file) => ({
    file,
    alt: prevAlts.get(file) || defaultAltFromFilename(file),
  }));

  const manifest = {
    version: 1,
    items,
  };

  const jsonPretty = JSON.stringify(manifest, null, 2) + "\n";
  fs.writeFileSync(manifestPath, jsonPretty, "utf8");
  console.log("Wrote", manifestPath, "(" + items.length + " image" + (items.length === 1 ? "" : "s") + ")");

  const htmlPath = path.join(repoRoot, "megaflash.html");
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, "utf8");
    const embedded = JSON.stringify(manifest, null, 2);
    const nextHtml = html.replace(
      /<script type="application\/json" id="megaflash-gallery-manifest">[\s\S]*?<\/script>/,
      '<script type="application/json" id="megaflash-gallery-manifest">\n' + embedded + "\n</script>"
    );
    if (nextHtml !== html) {
      fs.writeFileSync(htmlPath, nextHtml, "utf8");
      console.log("Updated embedded manifest in megaflash.html");
    }
  }
}

main();
