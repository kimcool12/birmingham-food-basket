"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";

const PAGE = "/admin/categories";

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fail(message) {
  redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
}

function readName(formData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) {
    fail("Category name must be 2 to 60 characters.");
  }
  const slug = slugify(name);
  if (!slug) fail("Category name must contain letters or numbers.");
  return { name, slug };
}

async function audit(adminId, action, targetId, oldValue, newValue) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      target: "Category",
      targetId,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
}

export async function createCategory(formData) {
  const admin = await requireAdmin();
  const { name, slug } = readName(formData);

  const clash = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug }] },
  });
  if (clash) fail("A category with that name already exists.");

  const created = await prisma.category.create({ data: { name, slug } });
  await audit(admin.id, "CATEGORY_CREATED", created.id, null, name);
  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function renameCategory(formData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const { name, slug } = readName(formData);

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) fail("Category not found.");

  const clash = await prisma.category.findFirst({
    where: { id: { not: id }, OR: [{ name }, { slug }] },
  });
  if (clash) fail("Another category already uses that name.");

  await prisma.category.update({ where: { id }, data: { name, slug } });
  await audit(admin.id, "CATEGORY_RENAMED", id, current.name, name);
  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function toggleCategory(formData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) fail("Category not found.");

  const isActive = !current.isActive;
  await prisma.category.update({ where: { id }, data: { isActive } });
  await audit(
    admin.id,
    isActive ? "CATEGORY_ACTIVATED" : "CATEGORY_DEACTIVATED",
    id,
    current.name,
    null,
  );
  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function deleteCategory(formData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) fail("Category not found.");

  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    fail(
      `"${current.name}" still has ${count} product(s). Move or delete them first, or deactivate the category instead.`,
    );
  }

  await prisma.category.delete({ where: { id } });
  await audit(admin.id, "CATEGORY_DELETED", id, current.name, null);
  revalidatePath(PAGE);
  redirect(PAGE);
}
