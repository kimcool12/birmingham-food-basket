import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import generated from "../src/generated/prisma/index.js";

const { PrismaClient } = generated;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (hidden) {
      rl._writeToOutput = (text) => {
        rl.output.write(text.startsWith(question) ? text : "*");
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function main() {
  const email = (await ask("Admin email: ")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("That is not a valid email address.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === "ADMIN") {
      console.log("That user is already an admin.");
      return;
    }
    const confirm = await ask(
      `${email} is already a customer. Promote to ADMIN? (yes/no): `,
    );
    if (confirm.toLowerCase() !== "yes") {
      console.log("Cancelled. Nothing changed.");
      return;
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN" },
    });
    console.log(
      `Done. ${email} is now an ADMIN. Log out and log in again to use it.`,
    );
    return;
  }

  const username = await ask("Admin username: ");
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    throw new Error(
      "Username must be 3 to 30 letters, numbers, dots, dashes or underscores.",
    );
  }
  const password = await ask("Admin password (min 10 characters): ", true);
  if (password.length < 10 || password.length > 72) {
    throw new Error("Password must be between 10 and 72 characters.");
  }
  const again = await ask("Repeat password: ", true);
  if (again !== password) {
    throw new Error("The passwords did not match.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, username, passwordHash, role: "ADMIN" },
  });
  console.log(`Done. Admin account created for ${email}.`);
}

main()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
