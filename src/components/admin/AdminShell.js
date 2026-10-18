"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  Users,
  MessageSquare,
  Layers,
  Truck,
  Bell,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Responses", href: "/admin/responses", icon: MessageSquare },
  { label: "Aggregator", href: "/admin/aggregator", icon: Layers },
  { label: "Deliveries", href: "/admin/deliveries", icon: Truck },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminShell({ children, adminUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  // Determine current page title
  const currentItem = NAV_ITEMS.find((item) => {
    if (item.href === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }
    return pathname === item.href || pathname?.startsWith(item.href + "/");
  });
  const pageTitle = currentItem ? currentItem.label : "Admin Portal";

  const isItemActive = (href) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <div className="admin-layout">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`admin-sidebar-backdrop ${sidebarOpen ? "is-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Admin Sidebar */}
      <aside
        className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="Admin navigation"
      >
        <div className="admin-sidebar__header">
          <Link href="/admin/dashboard" className="sidebar-brand">
            <ShieldCheck className="header__logo-icon" aria-hidden="true" />
            <span>BFB Admin</span>
            <span className="brand-badge">PORTAL</span>
          </Link>
          <button
            type="button"
            className="sidebar-close btn-icon btn-icon--sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Admin Navigation Links">
          <span className="nav-section-title">Management</span>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-sidebar__item ${active ? "active is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="item-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-avatar" aria-hidden="true">
            {(adminUser?.username || adminUser?.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="admin-info">
            <span className="admin-name">
              {adminUser?.username || adminUser?.email || "Admin"}
            </span>
            <span className="admin-role">Administrator</span>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-icon btn-icon--sm ml-auto"
            title="Log out"
            aria-label="Log out of admin session"
          >
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="admin-layout__main">
        {/* Topbar */}
        <header className="admin-layout__topbar" role="banner">
          <div className="topbar-left">
            <button
              type="button"
              className="btn-icon sidebar-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar menu"
              aria-expanded={sidebarOpen}
            >
              <Menu aria-hidden="true" />
            </button>
            <h1 className="topbar-title">{pageTitle}</h1>
          </div>

          <div className="topbar-right">
            <Link
              href="/shop"
              className="btn btn-outline btn-sm"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View live customer shop"
            >
              <span>View Shop</span>
              <ExternalLink className="icon" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main id="admin-main-content" className="admin-layout__content">
          {children}
        </main>
      </div>
    </div>
  );
}
