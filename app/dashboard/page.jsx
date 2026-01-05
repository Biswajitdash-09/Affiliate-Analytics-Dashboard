"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Icon from "@/components/Icon";
import Card from "@/components/ui/Card";
import Chart from "@/components/ui/Chart";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import CreateCampaignModal from "@/components/dashboard/CreateCampaignModal";

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    kpis: {
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      conversionRate: 0,
    },
    chartData: [],
    recentActivity: []
  });
  const [activeChartMetric, setActiveChartMetric] = useState("clicks");
  const [leaderboards, setLeaderboards] = useState({ topAffiliates: [], topCampaigns: [] });

  // Chart configuration for different metrics
  const chartConfig = {
    clicks: {
      label: "Clicks",
      color: "#4f46e5", // Primary
      icon: "MousePointer2",
      formatter: (val) => val.toLocaleString(),
    },
    conversions: {
      label: "Conversions",
      color: "#10b981", // Success
      icon: "CheckCircle",
      formatter: (val) => val.toLocaleString(),
    },
    revenue: {
      label: "Revenue",
      color: "#f59e0b", // Warning
      icon: "DollarSign",
      formatter: (val) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(val),
    },
  };

  // Fetch analytics data from API
  const fetchAnalytics = useCallback(async (startDate, endDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/overview?${params}`);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        console.error("Failed to fetch analytics:", result.error);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch (Last 30 Days default)
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    fetchAnalytics(startDate.toISOString(), endDate.toISOString());

    // Fetch leaderboards
    fetch('/api/analytics/leaderboards')
      .then(res => res.json())
      .then(data => {
        if (data.success) setLeaderboards(data.data);
      })
      .catch(err => console.error('Leaderboards fetch error:', err));
  }, [fetchAnalytics]);

  // Handle date range changes from filter
  const handleRangeChange = ({ startDate, endDate }) => {
    fetchAnalytics(startDate, endDate);
  };

  // Prepare KPI cards data
  const stats = [
    {
      title: "Total Clicks",
      value: analyticsData.kpis.totalClicks.toLocaleString(),
      icon: "MousePointer2",
      color: "text-primary",
      bg: "bg-primary/10",
      loading: loading,
    },
    {
      title: "Conversions",
      value: analyticsData.kpis.totalConversions.toLocaleString(),
      icon: "CheckCircle",
      color: "text-success",
      bg: "bg-success/10",
      loading: loading,
    },
    {
      title: "Revenue",
      value: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(analyticsData.kpis.totalRevenue),
      icon: "DollarSign",
      color: "text-warning",
      bg: "bg-warning/10",
      loading: loading,
    },
    {
      title: "Conversion Rate",
      value: `${analyticsData.kpis.conversionRate}%`,
      icon: "Percent",
      color: "text-secondary",
      bg: "bg-secondary/10",
      loading: loading,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content">
            Welcome back, {user?.role === 'admin' ? "Admin" : user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-base-content/60 mt-1">
            Here's your performance overview for the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter onRangeChange={handleRangeChange} />

          {/* Export Dropdown */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-outline btn-sm">
              <Icon name="Download" size={16} />
              Export
            </label>
            <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 rounded-box w-40 border border-base-200">
              <li><a href="/api/export?type=csv&data=analytics" download>📄 CSV</a></li>
              <li><a href="/api/export?type=pdf&data=analytics" download>📕 PDF</a></li>
            </ul>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={() => setIsCampaignModalOpen(true)}
              className="btn btn-primary btn-sm shadow-lg shadow-primary/20"
            >
              <Icon name="Plus" size={16} />
              New Campaign
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all duration-300"
          >
            <div className="card-body p-6">
              {stat.loading ? (
                // Skeleton Loading State
                <div className="animate-pulse space-y-4">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-base-300 rounded"></div>
                    <div className="h-10 w-10 bg-base-300 rounded-xl"></div>
                  </div>
                  <div className="h-8 w-32 bg-base-300 rounded"></div>
                </div>
              ) : (
                // Actual Content
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/60 mb-1">
                        {stat.title}
                      </p>
                      <h3 className="text-2xl font-bold text-base-content">
                        {stat.value}
                      </h3>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                      <Icon name={stat.icon} size={20} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-success flex items-center gap-1 font-medium">
                      <Icon name="TrendingUp" size={14} />
                      Live Data
                    </span>
                    <span className="text-base-content/40 ml-2">
                      updated just now
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2">
          <Card className="h-full min-h-112.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-bold">Performance Trends</h3>
                <p className="text-xs text-base-content/50">
                  Visualizing {chartConfig[activeChartMetric].label.toLowerCase()} over time
                </p>
              </div>

              {/* Chart Metric Selector */}
              <div className="join bg-base-200/50 p-1 rounded-lg">
                {Object.keys(chartConfig).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setActiveChartMetric(metric)}
                    className={`join-item btn btn-sm border-0 ${activeChartMetric === metric
                      ? "btn-active bg-white shadow-sm text-primary"
                      : "btn-ghost text-base-content/60"
                      }`}
                  >
                    {chartConfig[metric].label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="w-full h-75 bg-base-200/30 rounded-xl animate-pulse flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary/20"></span>
              </div>
            ) : (
              <Chart
                data={analyticsData.chartData}
                type="area"
                dataKey={activeChartMetric}
                xAxisKey="date"
                color={chartConfig[activeChartMetric].color}
                height={320}
                valueFormatter={chartConfig[activeChartMetric].formatter}
              />
            )}
          </Card>
        </div>

        {/* Recent Activity Feed (Static/Placeholder for now as per context) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <div className="badge badge-ghost text-xs">Real-time</div>
            </div>

            <div className="space-y-0 relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-base-200"></div>

              {(!analyticsData.recentActivity || analyticsData.recentActivity.length === 0) ? (
                <div className="py-8 text-center text-base-content/50 text-sm">
                  No recent activity
                </div>
              ) : (
                analyticsData.recentActivity.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start py-3 relative group">
                    <div className="w-8 h-8 rounded-full bg-base-100 border-2 border-base-200 flex items-center justify-center text-base-content/40 z-10 group-hover:border-primary group-hover:text-primary transition-colors">
                      <Icon
                        name={item.type === "click" ? "MousePointer2" : "CheckCircle"}
                        size={14}
                        className={item.type === "conversion" ? "text-success" : ""}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-base-content">
                        {item.type === "click" ? "New click detected" : "Conversion recorded"}
                      </p>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        Campaign "{item.campaignName}" • {
                          (() => {
                            const diff = Math.floor((new Date() - new Date(item.createdAt)) / 60000);
                            if (diff < 1) return "Just now";
                            if (diff < 60) return `${diff} mins ago`;
                            const hours = Math.floor(diff / 60);
                            if (hours < 24) return `${hours} hours ago`;
                            return new Date(item.createdAt).toLocaleDateString();
                          })()
                        }
                      </p>
                    </div>
                    {item.type === "conversion" && (
                      <div className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded">
                        +{item.currency === 'INR' ? '₹' : item.currency}{item.amount}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button className="btn btn-ghost btn-sm w-full mt-4 text-primary hover:bg-primary/5">
              View All Activity
              <Icon name="ArrowRight" size={14} />
            </button>
          </Card>
        </div>
      </div>

      {/* Leaderboards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Affiliates */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Icon name="Trophy" size={18} className="text-warning" />
              Top Affiliates
            </h3>
          </div>
          <div className="space-y-3">
            {leaderboards.topAffiliates.length === 0 ? (
              <p className="text-sm text-base-content/50">No data yet</p>
            ) : (
              leaderboards.topAffiliates.map((aff, i) => (
                <div key={aff._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-warning/20 text-warning' :
                    i === 1 ? 'bg-base-300 text-base-content' :
                      'bg-base-200 text-base-content/60'
                    }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{aff.name || 'Unknown'}</p>
                  </div>
                  <div className="text-success font-bold">₹{aff.total_earnings?.toFixed(0)}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top Campaigns */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Icon name="Target" size={18} className="text-primary" />
              Top Campaigns
            </h3>
          </div>
          <div className="space-y-3">
            {leaderboards.topCampaigns.length === 0 ? (
              <p className="text-sm text-base-content/50">No data yet</p>
            ) : (
              leaderboards.topCampaigns.map((camp, i) => (
                <div key={camp._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-primary/20 text-primary' : 'bg-base-200 text-base-content/60'
                    }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate">{camp.name}</p>
                  </div>
                  <div className="font-mono text-sm">{camp.clicks} clicks</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <CreateCampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSuccess={() => {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 30);
          fetchAnalytics(startDate.toISOString(), endDate.toISOString());
        }}
      />
    </div>
  );
};

export default DashboardPage;