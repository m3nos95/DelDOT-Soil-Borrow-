"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

const credsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().trim().min(1).max(40).optional(),
});

export type AuthState = { error?: string; ok?: boolean };

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, password, displayName } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return { error: "That username is taken" };

  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      displayName: displayName || username,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  });
  redirect("/clubhouse");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Enter username and password" };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid username or password" };
  }

  await createSession({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  });
  redirect("/clubhouse");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
