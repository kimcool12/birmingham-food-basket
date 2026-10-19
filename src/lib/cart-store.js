"use client";

import { useSyncExternalStore } from "react";

const KEY = "bfb-cart-v1";
const MAX_QTY = 999;
const EMPTY = [];
const listeners = new Set();
let cache = null;

function isValid(item) {
  return Boolean(
    item &&
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.unit === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0,
  );
}

function load() {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(items) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage can be blocked; the cart then lives only until the page closes.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === KEY || event.key === null) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function clamp(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY, Math.max(1, n));
}

export function useCart() {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export function useCartCount() {
  return useSyncExternalStore(
    subscribe,
    () => load().length,
    () => 0,
  );
}

export function addItem(product, quantity) {
  const items = load();
  const qty = clamp(quantity);
  const found = items.find((item) => item.productId === product.id);
  if (found) {
    save(
      items.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: clamp(item.quantity + qty) }
          : item,
      ),
    );
    return;
  }
  save([
    ...items,
    {
      productId: product.id,
      name: product.name,
      size: product.size ?? "",
      unit: product.unit,
      price: Number(product.price),
      quantity: qty,
    },
  ]);
}

export function setQuantity(productId, quantity) {
  save(
    load().map((item) =>
      item.productId === productId
        ? { ...item, quantity: clamp(quantity) }
        : item,
    ),
  );
}

export function removeItem(productId) {
  save(load().filter((item) => item.productId !== productId));
}

export function clearCart() {
  save([]);
}
