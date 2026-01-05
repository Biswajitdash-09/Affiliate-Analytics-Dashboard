"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                    isActive
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                    isActive
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
      <div className="p-4 border-t border-base-300/50">
        <div className="bg-base-200/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
              <Icon name="Zap" size={16} />
            </div>
            <div>
              <p className="text-sm font-bold">Pro Plan</p>
              <p className="text-xs text-base-content/60">Active until Dec 31</p>
            </div>
          </div>
          <div className="w-full bg-base-300 rounded-full h-1.5 mb-1">
            <div className="bg-secondary h-1.5 rounded-full w-3/4"></div>
          </div>
          <p className="text-xs text-right text-base-content/50">75% Used</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;