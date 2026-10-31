"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCartCount, setCartOwner } from "../../lib/cart-store";
import { ShoppingCart, Bell, LogOut, LogIn, ShoppingBag } from "lucide-react";
import MobileMenu from "./MobileMenu";
import "./header-fix.scss";

// Cart, Notifications and Profile have their own icons in the bar, so the bar only needs the
// main browsing links. The menu on small screens still lists every link.
const navLinks = [
  { label: "Home", href: "/", inBar: true },
  { label: "Shop", href: "/shop", inBar: true },
  { label: "Categories", href: "/categories", inBar: true },
  { label: "Cart", href: "/cart", inBar: false },
  { label: "My Orders", href: "/orders", inBar: true },
  { label: "Notifications", href: "/notifications", inBar: false },
  { label: "Profile", href: "/profile", inBar: false },
];

export default function CustomerHeader({ user, unreadCount = 0 }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleRef = useRef(null);
  const pathname = usePathname();
  setCartOwner(user?.email);
  const cartCount = useCartCount();

  function closeMenu() {
    setMobileOpen(false);
    toggleRef.current?.focus();
  }

  // Close the menu when the page changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close the menu with the Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && mobileOpen) closeMenu();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Close the menu if the window becomes wide enough for the full bar
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    function handleChange(e) {
      if (e.matches) setMobileOpen(false);
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // Stop the page behind the menu from scrolling
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <header className="header" role="banner">
      <div className="container header__inner">
        {/* Brand / Logo */}
        <Link href="/" className="header__logo" aria-label="Birmingham Food Basket - Home">
          <ShoppingBag className="header__logo-icon" aria-hidden="true" />
          <span className="header__logo-text">
            Birmingham <span>Food Basket</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="header__nav" aria-label="Main navigation">
          {navLinks
            .filter((link) => link.inBar)
            .map((link) => (
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
          <Link
            href="/notifications"
            className="header__action-btn header__action-btn--notification"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell aria-hidden="true" />
            <span className="count-badge" aria-hidden="true">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </Link>

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

          {user ? (
            <div className="header__user-menu">
              <Link
                href="/profile"
                className="user-avatar"
                title={user.name || user.email}
                aria-label={`Signed in as ${user.name || user.email}. Open your profile`}
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

          {/* Menu button: tablets and phones only */}
          <button
            ref={toggleRef}
            type="button"
            className="bfb-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <MobileMenu
        open={mobileOpen}
        onClose={closeMenu}
        links={navLinks}
        isActive={isActive}
        user={user}
        cartCount={cartCount}
        unreadCount={unreadCount}
      />
    </header>
  );
}
