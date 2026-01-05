"use client";

import React, { useState, useEffect } from "react";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import LinkGenerator from "@/components/dashboard/LinkGenerator";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const AffiliatesPage = () => {
  // State Management
  const [affiliates, setAffiliates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const initialFormState = {
    name: "",
    email: "",
    password: "",
    commission_rate: "0.10",
    status: "active"
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Affiliates Data
  const fetchAffiliates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/affiliates");
      const data = await res.json();

      if (data.success) {
        setAffiliates(data.data);
      } else {
        console.error("Failed to fetch affiliates:", data.error);
      }
    } catch (err) {
      console.error("Error fetching affiliates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Affiliate Status Update (Approve/Reject)
  const handleStatusUpdate = async (affiliateId, newStatus) => {
    try {
      const res = await fetch("/api/affiliates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchAffiliates(); // Refresh
      } else {
        alert(data.error || "Failed to update");
      }
    } catch (err) {
      console.error("Error updating affiliate:", err);
    }
  };

  // Initial Fetch
  useEffect(() => {
    fetchAffiliates();
  }, []);

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        setFormData(initialFormState);
        fetchAffiliates(); // Refresh the list
      } else {
        setError(data.error || "Failed to create affiliate");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Table Column Definitions
  const columns = [
    {
      label: "Affiliate",
      key: "user",
      className: "min-w-[200px]",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 ring ring-base-200 ring-offset-1">
              <span className="text-xs font-bold">
                {row.user?.name?.substring(0, 2).toUpperCase() || "NA"}
              </span>
            </div>
          </div>
          <div>
            <div className="font-bold text-base-content">{row.user?.name || "Unknown User"}</div>
            <div className="text-xs text-base-content/50">{row.user?.email}</div>
          </div>
        </div>
      )
    },
    {
      label: "Status",
      key: "status",
      render: (row) => {
        const statusStyles = {
          active: "badge-success text-success-content",
          pending: "badge-warning text-warning-content",
          suspended: "badge-error text-error-content"
        };
        return (
          <div className={`badge ${statusStyles[row.status] || "badge-ghost"} gap-1 capitalize font-medium`}>
            {row.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>}
            {row.status}
          </div>
        );
      }
    },
    {
      label: "Commission",
      key: "commission_rate",
      render: (row) => (
        <div className="font-mono font-medium text-base-content/80">
          {(row.commission_rate * 100).toFixed(0)}%
        </div>
      )
    },
    {
      label: "Total Earnings",
      key: "total_earnings",
      render: (row) => (
        <div className="font-bold text-success flex items-center gap-1">
          <span>₹</span>
          {row.total_earnings?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )
    },
    {
      label: "Joined",
      key: "createdAt",
      render: (row) => (
        <div className="text-sm text-base-content/60 flex items-center gap-1">
          <Icon name="Calendar" size={14} className="opacity-50" />
          {new Date(row.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      label: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex gap-2">
          {/* Link Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedAffiliateId(row.user?._id);
              setIsLinkModalOpen(true);
            }}
            title="Generate Link"
          >
            <Icon name="Link" size={14} />
          </Button>

          {/* Approve/Reject for Pending */}
          {row.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-success hover:bg-success/10"
                onClick={() => handleStatusUpdate(row.user?._id, 'active')}
                title="Approve"
              >
                <Icon name="Check" size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-error hover:bg-error/10"
                onClick={() => handleStatusUpdate(row.user?._id, 'suspended')}
                title="Reject"
              >
                <Icon name="X" size={14} />
              </Button>
            </>
          )}

          {/* Suspend option for active */}
          {row.status === 'active' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-warning hover:bg-warning/10"
              onClick={() => handleStatusUpdate(row.user?._id, 'suspended')}
              title="Suspend"
            >
              <Icon name="Pause" size={14} />
            </Button>
          )}

          {/* Reactivate for suspended */}
          {row.status === 'suspended' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-info hover:bg-info/10"
              onClick={() => handleStatusUpdate(row.user?._id, 'active')}
              title="Reactivate"
            >
              <Icon name="Play" size={14} />
            </Button>
          )}
        </div>
      )
    }
  ];

  // Calculate Stats
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
  const totalPaid = affiliates.reduce((acc, curr) => acc + (curr.total_earnings || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
            <Icon name="Users" className="text-primary" size={32} />
            Affiliate Management
          </h1>
          <p className="text-base-content/60 mt-1">
            Manage your affiliate partners, track performance, and onboard new marketers.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Add Affiliate
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stats shadow-sm bg-base-100 border border-base-200 overflow-hidden">
          <div className="stat relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
            <div className="stat-figure text-primary">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Icon name="Users" size={24} />
              </div>
            </div>
            <div className="stat-title font-medium">Total Affiliates</div>
            <div className="stat-value text-primary">{totalAffiliates}</div>
            <div className="stat-desc">Registered partners</div>
          </div>
        </div>

        <div className="stats shadow-sm bg-base-100 border border-base-200 overflow-hidden">
          <div className="stat relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl"></div>
            <div className="stat-figure text-secondary">
              <div className="p-3 bg-secondary/10 rounded-xl">
                <Icon name="Activity" size={24} />
              </div>
            </div>
            <div className="stat-title font-medium">Active Partners</div>
            <div className="stat-value text-secondary">{activeAffiliates}</div>
            <div className="stat-desc">Currently promoting</div>
          </div>
        </div>

        <div className="stats shadow-sm bg-base-100 border border-base-200 overflow-hidden">
          <div className="stat relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-2xl"></div>
            <div className="stat-figure text-success">
              <div className="p-3 bg-success/10 rounded-xl">
                <Icon name="DollarSign" size={24} />
              </div>
            </div>
            <div className="stat-title font-medium">Total Earnings</div>
            <div className="stat-value text-success">
              ₹{totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-desc">Lifetime payouts generated</div>
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-0">
          <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/30">
            <h3 className="font-bold text-lg">All Affiliates</h3>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm btn-square" title="Refresh" onClick={fetchAffiliates}>
                <Icon name="RefreshCw" size={16} className={isLoading ? "animate-spin" : ""} />
              </button>
              <button className="btn btn-ghost btn-sm btn-square" title="Filter">
                <Icon name="Filter" size={16} />
              </button>
            </div>
          </div>
          <Table
            columns={columns}
            data={affiliates}
            isLoading={isLoading}
            emptyMessage="No affiliates found. Click 'Add Affiliate' to get started."
            className="border-none shadow-none rounded-t-none"
          />
        </div>
      </div>

      {/* Add Affiliate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Onboard New Affiliate"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="bg-base-200/50 p-4 rounded-lg mb-4 text-sm text-base-content/70 flex gap-3 items-start">
            <Icon name="Info" size={18} className="mt-0.5 text-info shrink-0" />
            <p>This will create a new user account and an associated affiliate profile. The user will be able to log in immediately.</p>
          </div>

          {error && (
            <div className="alert alert-error text-sm py-3 rounded-lg shadow-sm">
              <Icon name="AlertCircle" size={18} />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Sarah Jones"
            required
            disabled={isSubmitting}
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="sarah@example.com"
            required
            disabled={isSubmitting}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="••••••••"
            required
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Commission Rate"
              name="commission_rate"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.commission_rate}
              onChange={handleInputChange}
              placeholder="0.10"
              disabled={isSubmitting}
            />

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="select select-bordered w-full focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="modal-action pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="px-8"
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Generator Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Generate Tracking Link"
        size="md"
      >
        <LinkGenerator affiliateId={selectedAffiliateId} />
        <div className="modal-action">
          <Button onClick={() => setIsLinkModalOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AffiliatesPage;