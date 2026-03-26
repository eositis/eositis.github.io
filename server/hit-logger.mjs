import { createServer } from "node:http";
import { appendFile, mkdir, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname } from "node:path";

const PORT = Number(process.env.PORT || 8787);
const CSV_PATH = process.env.HIT_LOG_CSV || "./logs/hits.csv";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function toCsvField(value) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, "\"\"")}"`;
}

async function ensureCsvHeader() {
  await mkdir(dirname(CSV_PATH), { recursive: true });
  try {
    await access(CSV_PATH, fsConstants.F_OK);
  } catch {
    const header = [
      "server_timestamp_utc",
      "source_ip",
      "method",
      "host",
      "path",
      "url",
      "referrer",
      "anon_user_id",
      "user_agent",
      "language",
      "timezone",
      "screen",
      "client_timestamp"
    ].join(",");
    await appendFile(CSV_PATH, `${header}\n`, "utf8");
  }
}

function getSourceIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.length > 0) {
    return cf.trim();
  }
  return req.socket.remoteAddress || "";
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = createServer(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
  });

  req.on("end", async () => {
    try {
      const payload = raw ? JSON.parse(raw) : {};
      const rowValues = [
        new Date().toISOString(),
        getSourceIp(req),
        req.method,
        req.headers.host || "",
        payload.page || "",
        payload.url || "",
        payload.referrer || req.headers.referer || "",
        payload.anonUserId || "",
        payload.userAgent || req.headers["user-agent"] || "",
        payload.language || "",
        payload.timezone || "",
        payload.screen || "",
        payload.clientTimestamp || ""
      ];

      const row = `${rowValues.map(toCsvField).join(",")}\n`;
      await ensureCsvHeader();
      await appendFile(CSV_PATH, row, "utf8");

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "invalid_request", detail: String(error) }));
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Hit logger listening on http://localhost:${PORT} writing ${CSV_PATH}`);
});
