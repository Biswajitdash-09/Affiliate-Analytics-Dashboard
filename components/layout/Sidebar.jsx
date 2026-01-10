"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

import { useAuth } from "@/context/AuthContext";

const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    // Role-based Dashboard
    ...(user?.role === 'admin' ? [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      },
      {
        name: "Affiliates",
        href: "/dashboard/affiliates",
        icon: "Users",
      },
      {
        name: "Campaigns",
        href: "/dashboard/campaigns",
        icon: "Megaphone",
      },
      {
        name: "Payouts",
        href: "/dashboard/payouts",
        icon: "CreditCard",
      },
    ] : [
      {
        name: "My Portal",
        href: "/dashboard/my-portal",
        icon: "LayoutDashboard",
      },
      {
        name: "Available Campaigns",
        href: "/dashboard/campaigns",
        icon: "Megaphone",
      },
    ]),
  ];

  const secondaryItems = [
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: "Settings",
    },
    {
      name: "Help & Support",
      href: "/dashboard/help",
      icon: "HelpCircle",
    },
  ];

  return (
    <aside className="bg-base-100 w-80 min-h-full flex flex-col border-r border-base-300/50 text-base-content">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-base-300/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="BarChart2" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Affiliate<span className="text-primary">Pro</span>
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <ul className="menu w-full gap-2">
          <li className="menu-title text-xs font-bold uppercase text-base-content/50 mb-2 px-2">
            Main Menu
          </li>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${isActive
                    ? "bg-primary text-primary-content shadow-md shadow-primary/20"
                    : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
                    }`}
                >
                  <Icon name={item.icon} size={20} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Secondary Menu */}
        <ul className="menu w-full gap-2 mt-8">
          <li className="menu-title text-xs font-bold uppercase text-base-content/50 mb-2 px-2">
            System
          </li>
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${isActive
                    ? "bg-primary text-primary-content shadow-md shadow-primary/20"
                    : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
                    }`}
                >
                  <Icon name={item.icon} size={20} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer Area */}

    </aside>
  );
};

export default Sidebar;