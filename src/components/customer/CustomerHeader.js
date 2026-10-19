"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCartCount } from "../../lib/cart-store";
import {
  ShoppingCart,
  Bell,
  X,
  LogOut,
  LogIn,
  ShoppingBag,
} from "lucide-react";

export default function CustomerHeader({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const cartCount = useCartCount();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Categories", href: "/categories" },
    { label: "Cart", href: "/cart" },
    { label: "My Orders", href: "/orders" },
    { label: "Notifications", href: "/notifications" },
    { label: "Profile", href: "/profile" },
  ];

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <header className="header" role="banner">
      <div className="container header__inner">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="header__logo"
          aria-label="Birmingham Food Basket - Home"
        >
          <ShoppingBag className="header__logo-icon" aria-hidden="true" />
          <span className="header__logo-text">
            Birmingham <span>Food Basket</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="header__nav" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? "active" : ""}`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Header Actions */}
        <div className="header__actions">
          {/* Notifications Link with 0 badge */}
          <Link
            href="/notifications"
            className="header__action-btn header__action-btn--notification"
            aria-label="Notifications, 0 unread"
          >
            <Bell aria-hidden="true" />
            <span className="count-badge" aria-hidden="true">
              0
            </span>
          </Link>

          {/* Cart Link with live item count */}
          <Link
            href="/cart"
            className="header__action-btn"
            aria-label={`Shopping Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <ShoppingCart aria-hidden="true" />
            <span className="count-badge" aria-hidden="true">
              {cartCount}
            </span>
          </Link>

          {/* Session Authentication: Log in or Log out */}
          {user ? (
            <div className="header__user-menu">
              <Link
                href="/profile"
                className="user-avatar"
                title={user.name || user.email}
                aria-label={`Signed in as ${user.name || user.email}`}
              >
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn btn-outline btn-sm"
                aria-label="Log out of your account"
              >
                <LogOut className="icon" aria-hidden="true" />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary btn-sm"
              aria-label="Log in to your account"
            >
              <LogIn className="icon" aria-hidden="true" />
              <span>Log in</span>
            </Link>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className={`hamburger header__toggle ${mobileOpen ? "is-open" : ""}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={
              mobileOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Off-canvas Navigation */}
      <div
        className={`mobile-nav-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <nav
        id="mobile-navigation"
        className={`mobile-nav ${mobileOpen ? "is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-nav__header">
          <Link
            href="/"
            className="header__logo"
            onClick={() => setMobileOpen(false)}
            aria-label="Birmingham Food Basket"
          >
            <ShoppingBag className="header__logo-icon" aria-hidden="true" />
            <span className="header__logo-text">
              Birmingham <span>Food Basket</span>
            </span>
          </Link>
          <button
            type="button"
            className="btn-icon btn-icon--sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close mobile navigation menu"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-nav__body">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? "active is-active" : ""}`}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              <span>{link.label}</span>
              {link.href === "/cart" && (
                <span className="badge badge-primary ml-auto">{cartCount}</span>
              )}
              {link.href === "/notifications" && (
                <span className="badge badge-danger ml-auto">0</span>
              )}
            </Link>
          ))}
        </div>

        <div className="mobile-nav__footer">
          {user ? (
            <>
              <div className="d-flex align-center gap-sm mb-sm">
                <span className="user-avatar">
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold truncate">
                  {user.name || user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="btn btn-outline btn-block"
              >
                <LogOut className="icon" aria-hidden="true" />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary btn-block text-center"
              onClick={() => setMobileOpen(false)}
            >
              <LogIn className="icon" aria-hidden="true" />
              <span>Log in</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
