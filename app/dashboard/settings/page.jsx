"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const SettingsPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Profile State
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Global Settings State (Admin Only)
  const [globalSettings, setGlobalSettings] = useState({
    platformName: "",
    defaultCommissionRate: "",
    minimumPayout: "",
    supportEmail: "",
    allowRegistration: true,
  });

  // Attribution Settings State (Admin Only)
  const [attributionSettings, setAttributionSettings] = useState({
    attributionModel: "last_click",
    clickAttributionWindow: {
      value: 30,
      unit: "days",
    },
    cookieExpiry: {
      value: 30,
      unit: "days",
    },
    multipleTouchSessions: false,
  });

  // Initialize profile data from AuthContext
  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  // Fetch Global Settings (Admin Only)
  useEffect(() => {
    const fetchSettings = async () => {
      if (user?.role !== "admin") return;

      setIsSettingsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (data.success && data.data) {
          setGlobalSettings({
            platformName: data.data.platformName || "",
            defaultCommissionRate: data.data.defaultCommissionRate || 0.1,
            minimumPayout: data.data.minimumPayout || 5000,
            supportEmail: data.data.supportEmail || "",
            allowRegistration: data.data.allowRegistration ?? true,
          });

          // Load attribution settings
          if (data.data.attribution) {
            setAttributionSettings({
              attributionModel: data.data.attribution.attributionModel || "last_click",
              clickAttributionWindow: data.data.attribution.clickAttributionWindow || {
                value: 30,
                unit: "days",
              },
              cookieExpiry: data.data.attribution.cookieExpiry || {
                value: 30,
                unit: "days",
              },
              multipleTouchSessions: data.data.attribution.multipleTouchSessions || false,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  // Handle Profile Input Change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Global Settings Input Change
  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGlobalSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle Attribution Settings Input Change
  const handleAttributionChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested object paths for attribution
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setAttributionSettings((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else if (name === 'multipleTouchSessions') {
      setAttributionSettings((prev) => ({
        ...prev,
        [name]: e.target.checked,
      }));
    } else {
      setAttributionSettings((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Submit Profile Updates
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setIsLoading(true);

    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Profile updated successfully" });
        // Clear password fields
        setProfileData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Global Settings Updates
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setIsSettingsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(globalSettings),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Global settings updated successfully" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsSettingsLoading(false);
    }
  };

  // Submit Attribution Settings Updates
  const handleAttributionSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setIsSettingsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ attribution: attributionSettings }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Attribution settings updated successfully" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update attribution settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsSettingsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
          <Icon name="Settings" className="text-primary" size={32} />
          Settings
        </h1>
        <p className="text-base-content/60 mt-1">
          Manage your account preferences and system configurations.
        </p>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div
          className={`alert ${
            message.type === "success" ? "alert-success" : "alert-error"
          } shadow-lg`}
        >
          <Icon
            name={message.type === "success" ? "CheckCircle" : "AlertCircle"}
            size={24}
          />
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Settings */}
        <div className="lg:col-span-2 space-y-8">
          <Card title="Profile Information" icon="User">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  placeholder="Your Name"
                  required
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="divider text-sm text-base-content/50">Change Password</div>

              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                value={profileData.currentPassword}
                onChange={handleProfileChange}
                placeholder="••••••••"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={profileData.newPassword}
                  onChange={handleProfileChange}
                  placeholder="••••••••"
                />
                <Input
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={profileData.confirmPassword}
                  onChange={handleProfileChange}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Admin Only: Global Settings */}
          {user?.role === "admin" && (
            <Card
              title="Global System Settings"
              className="border-t-4 border-t-secondary"
            >
              <div className="mb-6 bg-base-200/50 p-4 rounded-lg flex gap-3 items-start">
                <Icon name="ShieldAlert" size={20} className="text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">Admin Area</p>
                  <p className="opacity-80">
                    These settings affect the entire platform and all affiliates. Please proceed with caution.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Platform Name"
                    name="platformName"
                    value={globalSettings.platformName}
                    onChange={handleSettingsChange}
                    placeholder="Affiliate Tracker Pro"
                  />
                  <Input
                    label="Support Email"
                    name="supportEmail"
                    type="email"
                    value={globalSettings.supportEmail}
                    onChange={handleSettingsChange}
                    placeholder="support@example.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Default Commission (0-1)"
                    name="defaultCommissionRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={globalSettings.defaultCommissionRate}
                    onChange={handleSettingsChange}
                  />
                  <Input
                    label="Min Payout Amount (₹)"
                    name="minimumPayout"
                    type="number"
                    min="0"
                    value={globalSettings.minimumPayout}
                    onChange={handleSettingsChange}
                  />
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      name="allowRegistration"
                      checked={globalSettings.allowRegistration}
                      onChange={handleSettingsChange}
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text font-medium">Allow Public Registration</span>
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    variant="secondary"
                    isLoading={isSettingsLoading}
                    disabled={isSettingsLoading}
                    className="w-full md:w-auto"
                  >
                    Update Global Settings
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Admin Only: Attribution Settings */}
          {user?.role === "admin" && (
            <Card
              title="Attribution Window Settings"
              className="border-t-4 border-t-primary"
            >
              <div className="mb-6 bg-base-200/50 p-4 rounded-lg">
                <div className="flex gap-3 items-start">
                  <Icon name="Target" size={20} className="text-info shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold">Conversion Attribution</p>
                    <p className="opacity-80">
                      Configure how affiliate conversions are attributed and tracked. These settings affect commission calculations across all campaigns.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAttributionSubmit} className="space-y-6">
                {/* Attribution Model Selection */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Attribution Model</span>
                    <span className="label-text-alt">
                      <Icon name="Info" size={14} />
                    </span>
                  </label>
                  <select
                    name="attributionModel"
                    value={attributionSettings.attributionModel}
                    onChange={handleAttributionChange}
                    className="select select-bordered w-full"
                  >
                    <option value="last_click">Last Click (Default)</option>
                    <option value="first_click">First Click</option>
                    <option value="linear">Linear (Equal Distribution)</option>
                    <option value="time_decay">Time Decay</option>
                  </select>
                  <label className="label">
                    <span className="label-text-alt">
                      {attributionSettings.attributionModel === "last_click" && "Credits commission to the last affiliate who referred the user."}
                      {attributionSettings.attributionModel === "first_click" && "Credits commission to the first affiliate who referred the user."}
                      {attributionSettings.attributionModel === "linear" && "Distributes commission evenly across all touched affiliates."}
                      {attributionSettings.attributionModel === "time_decay" && "Credits decrease as time from click increases."}
                    </span>
                  </label>
                </div>

                {/* Click Attribution Window */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Click Window Value</span>
                    </label>
                    <input
                      type="number"
                      name="clickAttributionWindow.value"
                      value={attributionSettings.clickAttributionWindow.value}
                      onChange={handleAttributionChange}
                      min="1"
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Click Window Unit</span>
                    </label>
                    <select
                      name="clickAttributionWindow.unit"
                      value={attributionSettings.clickAttributionWindow.unit}
                      onChange={handleAttributionChange}
                      className="select select-bordered w-full"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
                <label className="label pt-0">
                  <span className="label-text-alt">
                    Duration for which a click remains valid for conversion attribution.
                  </span>
                </label>

                {/* Cookie Expiry Settings */}
                <div className="divider text-sm text-base-content/50">Cookie & Storage Settings</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Cookie Expiry Value</span>
                    </label>
                    <input
                      type="number"
                      name="cookieExpiry.value"
                      value={attributionSettings.cookieExpiry.value}
                      onChange={handleAttributionChange}
                      min="1"
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Cookie Expiry Unit</span>
                    </label>
                    <select
                      name="cookieExpiry.unit"
                      value={attributionSettings.cookieExpiry.unit}
                      onChange={handleAttributionChange}
                      className="select select-bordered w-full"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>

                {/* Multiple Touch Sessions */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      name="multipleTouchSessions"
                      checked={attributionSettings.multipleTouchSessions}
                      onChange={handleAttributionChange}
                      className="checkbox checkbox-primary"
                    />
                    <div>
                      <span className="label-text font-medium">Allow Multiple Touch Sessions</span>
                      <span className="label-text-alt block">
                        Credit affiliates even if user interacted with multiple affiliates
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    variant="info"
                    isLoading={isSettingsLoading}
                    disabled={isSettingsLoading}
                    className="w-full md:w-auto"
                  >
                    Update Attribution Settings
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Right Column: Info & Help */}
        <div className="space-y-6">
          <div className="card bg-primary text-primary-content shadow-xl">
            <div className="card-body">
              <h2 className="card-title">
                <Icon name="Zap" size={24} />
                Pro Tips
              </h2>
              <p className="text-sm opacity-90">
                Keep your profile updated to ensure you receive important notifications and payouts on time.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <h3 className="font-bold text-lg mb-2">Account Status</h3>
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">Role</span>
                <span className="badge badge-outline uppercase font-bold">{user?.role || "User"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">Member Since</span>
                <span className="text-sm font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-base-content/70">Status</span>
                <span className="badge badge-success gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;