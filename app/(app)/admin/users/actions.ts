"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canAdminister } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import { editUserSchema, isSelfLockout, newUserSchema, USER_FIELDS, type UserFormInput } from "@/lib/validation/user";

export type UserFormState = FormState<UserFormInput>;

const e = messages.userForm.errors;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Submitted values without the password, so it is never sent back to the browser. */
function echo(values: UserFormInput): Partial<UserFormInput> {
  return { ...values, password: "" };
}

export async function createUser(_previous: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canAdminister(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, USER_FIELDS);
  const parsed = newUserSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echo(values) };

  const { password, ...data } = parsed.data;
  try {
    await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { username: e.usernameTaken }, values: echo(values) };
    throw error;
  }
  redirect("/admin/users");
}

export async function updateUser(userId: string, _previous: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canAdminister(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, USER_FIELDS);
  const parsed = editUserSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echo(values) };

  const { password, ...data } = parsed.data;
  if (isSelfLockout(actor, { id: userId }, data)) return { message: e.selfLockout, values: echo(values) };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { username: e.usernameTaken }, values: echo(values) };
    throw error;
  }
  redirect("/admin/users");
}
