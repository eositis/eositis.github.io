MegaFlash hero gallery — image files live in this folder.

Static sites cannot list a directory from the browser. The page reads the
gallery from an embedded JSON block in megaflash.html (works offline and when
fetch() to manifest.json would fail). The generator also writes
gallery/megaflash/manifest.json and keeps that JSON block in sync.

From the repository root:

  node scripts/generate-megaflash-gallery-manifest.mjs

The script scans this folder for .jpg, .jpeg, .png, .webp, .gif, .avif, .svg
and writes manifest.json, then updates the embedded <script type="application/json"
id="megaflash-gallery-manifest"> in megaflash.html. It keeps existing "alt" text
for files that were already listed.

Optional: edit alts in manifest.json, then run the script again — alts are
preserved when the filename matches.

Optional: use a full URL for one-off assets:

  { "src": "https://example.com/photo.jpg", "alt": "Description" }

File order in the carousel follows the "items" array (generator uses sorted
filenames). To control order, rename files with numeric prefixes, e.g. 01_hero.jpg.
