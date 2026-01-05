"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import Icon from "@/components/Icon";
import Button from "@/components/ui/Button";

const Topbar = () => {
  const { user, logout } = useAuth();

  return (
    <div className="navbar bg-base-100 border-b border-base-300/50 px-4 h-16 sticky top-0 z-30">
      {/* Mobile Menu Toggle */}
      <div className="flex-none lg:hidden">
        <label
          htmlFor="dashboard-drawer"
          className="btn btn-square btn-ghost drawer-button"
        >
          <Icon name="Menu" size={24} />
        </label>
      </div>

      {/* Left Side: Breadcrumbs or Title (Hidden on mobile for simplicity) */}
      <div className="flex-1 px-2 mx-2">
        <div className="hidden md:flex items-center text-sm breadcrumbs text-base-content/60">
          <ul>
            <li>
              <span className="flex items-center gap-2">
                <Icon name="Home" size={14} />
                Dashboard
              </span>
            </li>
            <li>Overview</li>
          </ul>
        </div>
      </div>

      {/* Right Side: Actions & Profile */}
      <div className="flex-none gap-4">
        {/* Notifications */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <div className="indicator">
              <Icon name="Bell" size={20} />
              <span className="badge badge-xs badge-primary indicator-item"></span>
            </div>
          </div>
          <div
            tabIndex={0}
            className="mt-3 z-[1] card card-compact dropdown-content w-80 bg-base-100 shadow-xl border border-base-200"
          >
            <div className="card-body">
              <span className="font-bold text-lg">Notifications</span>
              <span className="text-info">3 unread messages</span>
              <div className="card-actions">
                <button className="btn btn-primary btn-block btn-sm">
                  View all
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar placeholder border border-base-300"
          >
            <div className="bg-neutral text-neutral-content rounded-full w-10">
              <span className="text-lg font-semibold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-xl bg-base-100 rounded-box w-52 border border-base-200"
          >
            <li className="menu-title px-4 py-2">
              <div className="flex flex-col">
                <span className="font-bold text-base-content">
                  {user?.name || "User"}
                </span>
                <span className="text-xs text-base-content/60 font-normal">
                  {user?.email || "user@example.com"}
                </span>
                <span className="badge badge-xs badge-outline mt-2 uppercase">
                  {user?.role || "Member"}
                </span>
              </div>
            </li>
            <div className="divider my-0"></div>
            <li>
              <a className="py-3">
                <Icon name="User" size={16} />
                Profile
              </a>
            </li>
            <li>
              <a className="py-3">
                <Icon name="Settings" size={16} />
                Settings
              </a>
            </li>
            <div className="divider my-0"></div>
            <li>
              <button onClick={logout} className="text-error py-3 hover:bg-error/10">
                <Icon name="LogOut" size={16} />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Topbar;