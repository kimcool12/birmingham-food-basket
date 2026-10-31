"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogIn, LogOut, X } from "lucide-react";

// The slide-in menu for tablets and phones. It is drawn directly on the page (not inside the
// header), so it always covers the full screen height and can never be squeezed by the header.
export default function MobileMenu({
  open,
  onClose,
  links,
  isActive,
  user,
  cartCount,
  unreadCount,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const badgeFor = (href) => {
    if (href === "/cart" && cartCount > 0) return { text: cartCount, alert: false };
    if (href === "/notifications" && unreadCount > 0) {
      return { text: unreadCount > 99 ? "99+" : unreadCount, alert: true };
    }
    return null;
  };

  return createPortal(
    <div className="bfb-drawer">
      <div className="bfb-drawer__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="bfb-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu" id="mobile-menu">
        <div className="bfb-drawer__head">
          <p className="bfb-drawer__title">Menu</p>
          <button
            ref={closeRef}
            type="button"
            className="bfb-drawer__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <ul className="bfb-drawer__links">
          {links.map((link) => {
            const badge = badgeFor(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="bfb-drawer__link"
                  onClick={onClose}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  <span>{link.label}</span>
                  {badge && (
                    <span
                      className={`bfb-drawer__badge ${badge.alert ? "bfb-drawer__badge--alert" : ""}`}
                    >
                      {badge.text}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="bfb-drawer__foot">
          {user ? (
            <>
              <div className="bfb-drawer__user">
                <span className="bfb-drawer__avatar" aria-hidden="true">
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </span>
                <span>{user.name || user.email}</span>
              </div>
              <button
                type="button"
                className="bfb-drawer__button"
                onClick={() => {
                  onClose();
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut aria-hidden="true" />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="bfb-drawer__button bfb-drawer__button--primary" onClick={onClose}>
                <LogIn aria-hidden="true" />
                <span>Log in</span>
              </Link>
              <Link href="/register" className="bfb-drawer__button" onClick={onClose}>
                Create an account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
