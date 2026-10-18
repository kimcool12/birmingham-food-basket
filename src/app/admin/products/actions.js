"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/permissions";

const BASE = "/admin/products";
const AVAILABILITY = ["AVAILABLE", "LIMITED", "UNAVAILABLE"];

function safeReturn(formData) {
  const value = String(formData.get("returnTo") ?? "");
  return value.startsWith(BASE) ? value : BASE;
}

function go(returnTo, message) {
  if (!message) redirect(returnTo);
  const sep = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${sep}error=${encodeURIComponent(message)}`);
}

async function audit(adminId, action, targetId, oldValue, newValue) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      target: "Product",
      targetId,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
}

export async function setAvailability(formData) {
  const admin = await requireAdmin();
  const returnTo = safeReturn(formData);
  const id = String(formData.get("id") ?? "");
  const availability = String(formData.get("availability") ?? "");

  if (!AVAILABILITY.includes(availability))
    go(returnTo, "Invalid availability.");

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) go(returnTo, "Product not found.");

  if (product.availability !== availability) {
    await prisma.product.update({ where: { id }, data: { availability } });
    await audit(
      admin.id,
      "PRODUCT_AVAILABILITY_CHANGED",
      id,
      `${product.name}: ${product.availability}`,
      `${product.name}: ${availability}`,
    );
  }
  revalidatePath(BASE);
  go(returnTo);
}

export async function toggleProduct(formData) {
  const admin = await requireAdmin();
  const returnTo = safeReturn(formData);
  const id = String(formData.get("id") ?? "");

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) go(returnTo, "Product not found.");

  const isActive = !product.isActive;
  await prisma.product.update({ where: { id }, data: { isActive } });
  await audit(
    admin.id,
    isActive ? "PRODUCT_ACTIVATED" : "PRODUCT_DEACTIVATED",
    id,
    product.name,
    null,
  );
  revalidatePath(BASE);
  go(returnTo);
}

export async function deleteProduct(formData) {
  const admin = await requireAdmin();
  const returnTo = safeReturn(formData);
  const id = String(formData.get("id") ?? "");

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) go(returnTo, "Product not found.");

  const orderCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderCount > 0) {
    go(
      returnTo,
      `"${product.name}" appears in ${orderCount} order(s), so it can't be deleted. Deactivate it instead.`,
    );
  }

  await prisma.product.delete({ where: { id } });
  await audit(admin.id, "PRODUCT_DELETED", id, product.name, null);
  revalidatePath(BASE);
  go(returnTo);
}
function isMoney(value) {
  return /^\d{1,8}(\.\d{1,2})?$/.test(value);
}

function readProduct(formData) {
  const get = (key) => String(formData.get(key) ?? "").trim();
  const values = {
    name: get("name"),
    categoryId: get("categoryId"),
    brand: get("brand"),
    size: get("size"),
    unit: get("unit"),
    price: get("price"),
    availability: get("availability") || "AVAILABLE",
    stock: get("stock") || "0",
    description: get("description"),
  };

  const errors = {};
  if (values.name.length < 2 || values.name.length > 120) {
    errors.name = "Name must be 2 to 120 characters.";
  }
  if (!values.categoryId) errors.categoryId = "Choose a category.";
  if (values.brand.length > 60)
    errors.brand = "Brand must be 60 characters or fewer.";
  if (values.size.length > 40)
    errors.size = "Size must be 40 characters or fewer.";
  if (!values.unit || values.unit.length > 20) {
    errors.unit = "Enter a unit of up to 20 characters, for example KG or box.";
  }
  if (!isMoney(values.price)) errors.price = "Enter a price like 12 or 12.50.";
  if (!AVAILABILITY.includes(values.availability)) {
    errors.availability = "Choose an availability.";
  }
  if (!isMoney(values.stock))
    errors.stock = "Enter stock as a number like 0 or 25.5.";
  if (values.description.length > 500) {
    errors.description = "Description must be 500 characters or fewer.";
  }
  return { values, errors };
}

function productData(values) {
  return {
    categoryId: values.categoryId,
    name: values.name,
    brand: values.brand || null,
    size: values.size || null,
    unit: values.unit,
    price: values.price,
    availability: values.availability,
    stock: values.stock,
    description: values.description || null,
  };
}

async function isDuplicate(values, excludeId) {
  const found = await prisma.product.findFirst({
    where: {
      categoryId: values.categoryId,
      name: { equals: values.name, mode: "insensitive" },
      size: values.size ? { equals: values.size, mode: "insensitive" } : null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(found);
}

async function checkCategoryAndDuplicate(values, errors, excludeId) {
  if (!errors.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: values.categoryId },
    });
    if (!category) errors.categoryId = "Choose a valid category.";
  }
  if (
    Object.keys(errors).length === 0 &&
    (await isDuplicate(values, excludeId))
  ) {
    errors.name =
      "A product with this name and size already exists in that category.";
  }
}

export async function createProduct(prevState, formData) {
  const admin = await requireAdmin();
  const { values, errors } = readProduct(formData);
  await checkCategoryAndDuplicate(values, errors, null);
  if (Object.keys(errors).length > 0) return { errors, values, message: "" };

  let created;
  try {
    created = await prisma.product.create({ data: productData(values) });
  } catch (error) {
    console.error("Create product error:", error);
    return {
      errors: {},
      values,
      message: "Unable to save the product. Please try again.",
    };
  }

  await audit(
    admin.id,
    "PRODUCT_CREATED",
    created.id,
    null,
    `${values.name}: £${Number(values.price).toFixed(2)}/${values.unit}`,
  );
  revalidatePath(BASE);
  redirect(BASE);
}

export async function updateProduct(prevState, formData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const { values, errors } = readProduct(formData);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { errors: {}, values, message: "Product not found." };

  await checkCategoryAndDuplicate(values, errors, id);
  if (Object.keys(errors).length > 0) return { errors, values, message: "" };

  try {
    await prisma.product.update({ where: { id }, data: productData(values) });
  } catch (error) {
    console.error("Update product error:", error);
    return {
      errors: {},
      values,
      message: "Unable to save the product. Please try again.",
    };
  }

  const oldPrice = Number(existing.price).toFixed(2);
  const newPrice = Number(values.price).toFixed(2);
  await audit(admin.id, "PRODUCT_UPDATED", id, existing.name, values.name);
  if (oldPrice !== newPrice) {
    await audit(
      admin.id,
      "PRODUCT_PRICE_CHANGED",
      id,
      `${existing.name}: £${oldPrice}/${existing.unit}`,
      `${values.name}: £${newPrice}/${values.unit}`,
    );
  }
  if (existing.availability !== values.availability) {
    await audit(
      admin.id,
      "PRODUCT_AVAILABILITY_CHANGED",
      id,
      `${existing.name}: ${existing.availability}`,
      `${values.name}: ${values.availability}`,
    );
  }
  revalidatePath(BASE);
  redirect(BASE);
}
