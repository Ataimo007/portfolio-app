import { SMTPServer } from "smtp-server";
import nodemailer from "nodemailer";
import pg from "pg";
import { createServer } from "node:http";
import { reserveIdentityMail } from "./identity-mail-policy.mjs";
const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "portfolio",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 2,
  connectionTimeoutMillis: 4000,
  statement_timeout: 5000,
});
const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: 465,
  secure: true,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
  connectionTimeout: 8000,
  socketTimeout: 15000,
  logger: false,
});
function denial(text, code = 451) {
  const error = new Error(text);
  error.responseCode = code;
  return error;
}
const server = new SMTPServer({
  name: "Ataimo identity mail guard",
  authOptional: true,
  disabledCommands: ["AUTH", "STARTTLS"],
  size: 128000,
  logger: false,
  onMailFrom(address, session, callback) {
    callback(
      address.address.toLowerCase() === "hello@ataimo.com"
        ? undefined
        : denial("Sender unavailable", 550),
    );
  },
  async onRcptTo(address, session, callback) {
    try {
      if (
        session.envelope.rcptTo.length ||
        !(await reserveIdentityMail(pool, address.address))
      )
        return callback(denial("Identity email temporarily restricted"));
      callback();
    } catch {
      callback(denial("Identity email temporarily unavailable"));
    }
  },
  onData(stream, session, callback) {
    const chunks = [];
    let size = 0;
    stream.on("data", (chunk) => {
      size += chunk.length;
      if (size <= 128000) chunks.push(chunk);
    });
    stream.on("error", () => callback(denial("Message unavailable")));
    stream.on("end", async () => {
      if (size > 128000) return callback(denial("Message too large", 552));
      try {
        await transport.sendMail({
          envelope: {
            from: session.envelope.mailFrom.address,
            to: session.envelope.rcptTo.map((r) => r.address),
          },
          raw: Buffer.concat(chunks),
        });
        callback();
      } catch {
        callback(denial("Identity email delivery unavailable"));
      }
    });
  },
});
server.listen(2525, "127.0.0.1");
const health = createServer(async (request, response) => {
  try {
    await pool.query("SELECT 1 FROM identity_mail_suppressions LIMIT 1");
    response.writeHead(200).end("ok");
  } catch {
    response.writeHead(503).end("unavailable");
  }
});
health.listen(8026, "0.0.0.0");
async function shutdown() {
  health.close();
  server.close();
  transport.close();
  await pool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
