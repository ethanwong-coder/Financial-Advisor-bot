import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/password";
import { badRequest, json, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }
  const email = parsed.data.email.toLowerCase();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return badRequest("An account with that email already exists");

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name,
        profile: { create: {} },
      },
      select: { id: true, email: true },
    });
    return json({ id: user.id, email: user.email }, 201);
  } catch (err) {
    log.error("register failed", err);
    return serverError("Could not create account");
  }
}
