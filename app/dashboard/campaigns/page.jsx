"use client";

import React, { useState, useEffect } from "react";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

import { useAuth } from "@/context/AuthContext";

const CampaignsPage = () => {
  const { user } = useAuth();

  // State Management
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const initialFormState = {
    name: "",
    url: "",
    payoutType: "CPA", // Helper for UI logic
    payoutAmount: "",
    payoutCurrency: "INR",
    payoutCustom: "",
    status: "active"
  };
  const [formData, setFormData] = useState(initialFormState);

  // Search and View State
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'

  // Filter Campaigns
  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch Campaigns Data
  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();

      if (data.success) {
        setCampaigns(data.data);
      } else {
        console.error("Failed to fetch campaigns:", data.error);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLink = (campaignId) => {
    if (!user?._id) return;
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}/api/tracking/click?affiliate_id=${user._id}&campaign_id=${campaignId}`;

    navigator.clipboard.writeText(trackingUrl).then(() => {
      alert("Tracking link copied to clipboard!");
    });
  };

  // Initial Fetch
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Construct payout_rules based on type
    let payout_rules;
    if (formData.payoutType === "Custom") {
      if (!formData.payoutCustom) {
        setError("Please enter the custom payout rule details.");
        setIsSubmitting(false);
        return;
      }
      payout_rules = formData.payoutCustom;
    } else if (formData.payoutType === "RevShare") {
      if (!formData.payoutAmount) {
        setError("Please enter the percentage amount.");
        setIsSubmitting(false);
        return;
      }
      payout_rules = {
        type: "RevShare",
        percentage: parseFloat(formData.payoutAmount),
        duration: "lifetime", // Default for simplicity
      };
    } else {
      // CPA or Fixed
      if (!formData.payoutAmount) {
        setError("Please enter the payout amount.");
        setIsSubmitting(false);
        return;
      }
      payout_rules = {
        type: formData.payoutType,
        amount: parseFloat(formData.payoutAmount),
        currency: "INR",
      };
    }

    const payload = {
      name: formData.name,
      url: formData.url,
      payout_rules,
      status: formData.status,
    };

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        setFormData(initialFormState);
        fetchCampaigns(); // Refresh the list
      } else {
        setError(data.error || "Failed to create campaign");
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
      label: "Campaign Name",
      key: "name",
      className: "min-w-[200px]",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon name="Megaphone" size={20} />
          </div>
          <div>
            <div className="font-bold text-base-content">{row.name}</div>
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 max-w-50 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {row.url}
              <Icon name="ExternalLink" size={10} />
            </a>
          </div>
        </div>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (row) => {
        const statusStyles = {
          active: "badge-success text-success-content",
          paused: "badge-warning text-warning-content",
          archived: "badge-neutral text-neutral-content",
        };
        return (
          <div
            className={`badge ${statusStyles[row.status] || "badge-ghost"
              } gap-1 capitalize font-medium`}
          >
            {row.status === "active" && (
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
            )}
            {row.status}
          </div>
        );
      },
    },
    {
      label: "Payout Model",
      key: "payout_rules",
      render: (row) => {
        const rules = row.payout_rules;

        if (typeof rules === "string") {
          return (
            <div className="badge badge-ghost gap-1">
              <Icon name="FileText" size={12} />
              Custom
            </div>
          );
        }

        if (typeof rules === "object") {
          if (rules.type === "RevShare") {
            return (
              <div className="badge badge-secondary badge-outline gap-1">
                <Icon name="Percent" size={12} />
                RevShare
              </div>
            );
          }
          return (
            <div className="badge badge-primary badge-outline gap-1">
              <Icon name="DollarSign" size={12} />
              {rules.type || "CPA"}
            </div>
          );
        }
        return <span className="text-xs opacity-50">Unknown</span>;
      },
    },
    {
      label: "Value",
      key: "value",
      render: (row) => {
        const rules = row.payout_rules;
        if (typeof rules === "string") return <span className="text-xs italic opacity-70 truncate max-w-37.5" title={rules}>{rules}</span>;

        if (rules.type === "RevShare") {
          return <span className="font-bold text-secondary">{rules.percentage}%</span>;
        }

        return (
          <span className="font-bold text-success">
            {rules.currency === "INR" ? "₹" : rules.currency}
            {rules.amount?.toFixed(2)}
          </span>
        );
      }
    },
    {
      label: "Created",
      key: "createdAt",
      render: (row) => (
        <div className="text-sm text-base-content/60 flex items-center gap-1">
          <Icon name="Calendar" size={14} className="opacity-50" />
          {new Date(row.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      label: "Actions",
      key: "actions",
      render: (row) => (
        user?.role !== 'admin' && (
          <Button
            size="sm"
            variant="ghost"
            className="text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              handleGetLink(row._id);
            }}
          >
            <Icon name="Link" size={16} className="mr-1" />
            Get Link
          </Button>
        )
      )
    }
  ];

  // Calculate Stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const pausedCampaigns = campaigns.filter((c) => c.status === "paused").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header ... same ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
            <Icon name="Target" className="text-primary" size={32} />
            {user?.role === 'admin' ? "Campaign Management" : "Available Campaigns"}
          </h1>
          <p className="text-base-content/60 mt-1">
            {user?.role === 'admin'
              ? "Create, track, and optimize your marketing campaigns and offers."
              : "Browse available campaigns and generate tracking links to start earning."}
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            <Icon name="Plus" size={18} className="mr-2" />
            Create Campaign
          </Button>
        )}
      </div>

      {/* Stats Overview ... same ... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stats shadow-sm bg-base-100 border border-base-200 overflow-hidden">
          <div className="stat relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
            <div className="stat-figure text-primary">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Icon name="Layers" size={24} />
              </div>
            </div>
            <div className="stat-title font-medium">Total Campaigns</div>
            <div className="stat-value text-primary">{totalCampaigns}</div>
            <div className="stat-desc">All time created</div>
          </div>
        </div>

        <div className="stats shadow-sm bg-base-100 border border-base-200 overflow-hidden">
          <div className="stat relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-2xl"></div>
            <div className="stat-figure text-success">
              <div className="p-3 bg-success/10 rounded-xl">
                <Icon name="PlayCircle" size={24} />
              </div>
            </div>
            <div className="stat-title font-medium">Active Offers</div>
            <div className="stat-value text-success">{activeCampaigns}</div>
            <div className="stat-desc">Currently running</div>
          </div>
        </div>

        <div className="stats shadow-sm bg-base-100 border border-base-200 overflow-hidden">
          <div className="stat relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning/10 rounded-full blur-2xl"></div>
            <div className="stat-figure text-warning">
              <div className="p-3 bg-warning/10 rounded-xl">
                <Icon name="PauseCircle" size={24} />
              </div>
            </div>
            <div className="stat-title font-medium">Paused</div>
            <div className="stat-value text-warning">{pausedCampaigns}</div>
            <div className="stat-desc">Temporarily stopped</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-base-200/30">
            <h3 className="font-bold text-lg hidden sm:block">All Campaigns</h3>

            <div className="flex flex-1 w-full sm:w-auto justify-end gap-3">
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
                  <Icon name="Search" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  className="input input-sm input-bordered w-full pl-9 focus:outline-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* View Toggle */}
              <div className="join">
                <button
                  className={`join-item btn btn-sm ${viewMode === 'list' ? 'btn-active btn-neutral' : 'btn-ghost'}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <Icon name="List" size={16} />
                </button>
                <button
                  className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-active btn-neutral' : 'btn-ghost'}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <Icon name="LayoutGrid" size={16} />
                </button>
              </div>

              <button
                className="btn btn-ghost btn-sm btn-square"
                title="Refresh"
                onClick={fetchCampaigns}
              >
                <Icon
                  name="RefreshCw"
                  size={16}
                  className={isLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="p-20 text-center text-base-content/40">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : viewMode === 'list' ? (
            <Table
              columns={columns}
              data={filteredCampaigns}
              isLoading={isLoading}
              emptyMessage={user?.role === 'admin'
                ? "No campaigns found. Click 'Create Campaign' to launch your first offer."
                : "No active campaigns available at the moment. Please check back later."}
              className="border-none shadow-none rounded-t-none"
            />
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.length === 0 ? (
                <div className="col-span-full text-center py-20 text-base-content/50 bg-base-200/20 rounded-xl border border-dashed border-base-300">
                  <p>{user?.role === 'admin'
                    ? "No campaigns found matching your search."
                    : "No campaigns available right now."}</p>
                </div>
              ) : (
                filteredCampaigns.map(campaign => (
                  <div key={campaign._id} className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="card-body p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-lg group-hover:scale-105 transition-transform">
                          <Icon name="Megaphone" size={24} />
                        </div>
                        <div className={`badge ${campaign.status === 'active' ? 'badge-success text-success-content' : 'badge-ghost'} capitalize`}>
                          {campaign.status}
                        </div>
                      </div>

                      <h3 className="font-bold text-lg line-clamp-1" title={campaign.name}>{campaign.name}</h3>
                      <a href={campaign.url} target="_blank" className="text-xs text-base-content/50 hover:text-primary truncate block mb-4">
                        {campaign.url}
                      </a>

                      <div className="bg-base-200/50 rounded-lg p-3 mb-4 flex justify-between items-center">
                        <span className="text-xs font-medium text-base-content/70">Commission</span>
                        {typeof campaign.payout_rules === 'string' ? (
                          <span className="text-sm font-bold">{campaign.payout_rules}</span>
                        ) : campaign.payout_rules.type === 'RevShare' ? (
                          <span className="text-sm font-bold text-secondary">{campaign.payout_rules.percentage}% RevShare</span>
                        ) : (
                          <span className="text-sm font-bold text-success">
                            {campaign.payout_rules.currency === 'INR' ? '₹' : campaign.payout_rules.currency} {campaign.payout_rules.amount} CPA
                          </span>
                        )}
                      </div>

                      <div className="card-actions justify-end mt-auto">
                        {user?.role === 'admin' ? (
                          <div className="text-xs text-base-content/40">Created: {new Date(campaign.createdAt).toLocaleDateString()}</div>
                        ) : (
                          <Button
                            variant="primary"
                            className="w-full shadow-lg shadow-primary/20"
                            onClick={() => handleGetLink(campaign._id)}
                          >
                            <Icon name="Link" size={16} className="mr-2" />
                            Get Tracking Link
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal ... same ... */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Create New Campaign"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Same form as before */}
          <div className="bg-base-200/50 p-4 rounded-lg mb-4 text-sm text-base-content/70 flex gap-3 items-start">
            <Icon name="Lightbulb" size={18} className="mt-0.5 text-warning shrink-0" />
            <p>
              Define your campaign details and payout structure. Use <code>{`{affiliate_id}`}</code> in the URL to track referrals.
            </p>
          </div>

          {error && (
            <div className="alert alert-error text-sm py-3 rounded-lg shadow-sm">
              <Icon name="AlertCircle" size={18} />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Campaign Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Summer Sale 2024"
            required
            disabled={isSubmitting}
          />

          <Input
            label="Tracking URL"
            name="url"
            value={formData.url}
            onChange={handleInputChange}
            placeholder="https://example.com?ref={affiliate_id}"
            required
            disabled={isSubmitting}
          />

          <div className="divider text-xs font-medium text-base-content/50 my-2">PAYOUT RULES</div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Payout Model</span>
            </label>
            <select
              name="payoutType"
              value={formData.payoutType}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="select select-bordered w-full focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="CPA">CPA (Cost Per Action)</option>
              <option value="RevShare">Revenue Share (%)</option>
              <option value="Fixed">Fixed Amount</option>
              <option value="Custom">Custom Description</option>
            </select>
          </div>

          {formData.payoutType === "Custom" ? (
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Rule Description</span>
              </label>
              <textarea
                name="payoutCustom"
                value={formData.payoutCustom}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="textarea textarea-bordered h-24 focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. ₹500 for first purchase, ₹250 for recurring..."
              ></textarea>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={formData.payoutType === "RevShare" ? "Percentage (%)" : "Amount"}
                name="payoutAmount"
                type="number"
                step={formData.payoutType === "RevShare" ? "0.1" : "0.01"}
                min="0"
                value={formData.payoutAmount}
                onChange={handleInputChange}
                placeholder={formData.payoutType === "RevShare" ? "20" : "25.00"}
                required
                disabled={isSubmitting}
              />

            </div>
          )}

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Initial Status</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="select select-bordered w-full focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
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
              Create Campaign
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default CampaignsPage;