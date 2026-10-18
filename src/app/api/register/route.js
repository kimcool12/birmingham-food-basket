import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const whatsapp = String(body?.whatsapp ?? "").trim();

  const errors = {};
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!USERNAME_RE.test(username)) {
    errors.username =
      "Username must be 3 to 30 letters, numbers, dots, dashes or underscores.";
  }
  if (password.length < 6)
    errors.password = "Password must be at least 6 characters.";
  if (password.length > 72)
    errors.password = "Password must be 72 characters or fewer.";
  if (!PHONE_RE.test(whatsapp))
    errors.whatsapp = "Enter a valid WhatsApp number.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please fix the errors below.", errors },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email or username already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, username, passwordHash, whatsapp, role: "CUSTOMER" },
    });

    return NextResponse.json({ message: "Account created." }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Unable to create your account. Please try again." },
      { status: 500 },
    );
  }
}
