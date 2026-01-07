"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import LinkGenerator from "@/components/dashboard/LinkGenerator";
import Icon from "@/components/Icon";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import CampaignTable from "@/components/dashboard/CampaignTable";
import FunnelChart from "@/components/dashboard/FunnelChart";

const MyPortalPage = () => {
    const { user, token } = useAuth();
    const [data, setData] = useState(null); // Overview Data
    const [analyticsData, setAnalyticsData] = useState(null); // Analytics Data
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchMyData = async () => {
            if (!token) return;

            setIsLoading(true);
            try {
                // Fetch Overview Data
                const res = await fetch("/api/affiliate/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                }

                // Fetch Analytics Data
                const resAnalytics = await fetch("/api/affiliate/analytics", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const resultAnalytics = await resAnalytics.json();
                if (resultAnalytics.success) {
                    setAnalyticsData(resultAnalytics.data);
                }

            } catch (error) {
                console.error("Error fetching portal data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyData();
    }, [token]);

    const stats = data?.stats || {};

    // Revenue History Columns
    const revenueColumns = [
        {
            label: "Date",
            key: "createdAt",
            render: (row) => {
                const d = new Date(row.createdAt);
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
            }
        },
        { label: "Amount", key: "amount", render: (row) => `₹${row.amount?.toFixed(2)}` },
        {
            label: "Commission", key: "commissionAmount", render: (row) => (
                <span className="text-success font-bold">₹{row.commissionAmount?.toFixed(2)}</span>
            )
        },
        {
            label: "Status", key: "status", render: (row) => (
                <span className={`badge badge-outline ${row.status === 'succeeded' ? 'badge-success' : 'badge-warning'}`}>
                    {row.status}
                </span>
            )
        }
    ];

    // Payout History Columns
    const payoutColumns = [
        {
            label: "Date",
            key: "createdAt",
            render: (row) => {
                const d = new Date(row.createdAt);
                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
            }
        },
        { label: "Amount", key: "amount", render: (row) => <span className="font-bold text-primary">₹{row.amount}</span> },
        { label: "Method", key: "method", render: (row) => <span className="badge badge-ghost capitalize">{row.method?.replace('_', ' ')}</span> },
        { label: "Ref", key: "transactionId", render: (row) => <span className="font-mono text-xs">{row.transactionId}</span> }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
                    <Icon name="User" className="text-primary" size={32} />
                    My Affiliate Portal
                </h1>
                <p className="text-base-content/60 mt-1">
                    Welcome back, {user?.name}! Track your performance and manage your links.
                </p>
            </div>

            {/* Tabs */}
            <div role="tablist" className="tabs tabs-boxed w-fit bg-base-200/50 p-1">
                <a
                    role="tab"
                    className={`tab ${activeTab === 'overview' ? 'tab-active bg-primary text-primary-content' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </a>
                <a
                    role="tab"
                    className={`tab ${activeTab === 'analytics' ? 'tab-active bg-primary text-primary-content' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    Detailed Analytics
                </a>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card bg-base-100 shadow-sm border border-base-200">
                            <div className="card-body">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-base-content/60">Total Earnings</p>
                                        <h3 className="text-2xl font-bold text-success">₹{stats.totalEarnings?.toFixed(2)}</h3>
                                    </div>
                                    <div className="p-3 bg-success/10 rounded-xl text-success">
                                        <Icon name="DollarSign" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-base-100 shadow-sm border border-base-200">
                            <div className="card-body">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-base-content/60">Pending Payout</p>
                                        <h3 className="text-2xl font-bold text-warning">₹{stats.pendingPayouts?.toFixed(2)}</h3>
                                    </div>
                                    <div className="p-3 bg-warning/10 rounded-xl text-warning">
                                        <Icon name="Clock" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-base-100 shadow-sm border border-base-200">
                            <div className="card-body">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-base-content/60">Total Paid</p>
                                        <h3 className="text-2xl font-bold text-primary">₹{stats.totalPaid?.toFixed(2)}</h3>
                                    </div>
                                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                        <Icon name="CheckCircle" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-base-100 shadow-sm border border-base-200">
                            <div className="card-body">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-base-content/60">My Commission Rate</p>
                                        <h3 className="text-2xl font-bold">{(stats.commissionRate * 100).toFixed(0)}%</h3>
                                    </div>
                                    <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                                        <Icon name="Percent" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Link Generator */}
                    <Card title="Generate Tracking Link" icon="Link">
                        <LinkGenerator affiliateId={user?._id} />
                    </Card>

                    {/* History Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Recent Earnings" icon="TrendingUp">
                            <Table
                                columns={revenueColumns}
                                data={data?.revenues || []}
                                isLoading={isLoading}
                                emptyMessage="No earnings yet. Start promoting!"
                            />
                        </Card>

                        <Card title="Payout History" icon="CreditCard">
                            <Table
                                columns={payoutColumns}
                                data={data?.payouts || []}
                                isLoading={isLoading}
                                emptyMessage="No payouts yet."
                            />
                        </Card>
                    </div>
                </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Trend Chart */}
                        <div className="lg:col-span-2">
                            <AnalyticsChart data={analyticsData?.daily || []} />
                        </div>

                        {/* Funnel Chart */}
                        <div className="lg:col-span-1">
                            <div className="h-[350px] w-full bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm">
                                <FunnelChart data={analyticsData?.funnel || []} />
                            </div>
                        </div>
                    </div>

                    {/* Campaign Performance Table */}
                    <CampaignTable campaigns={analyticsData?.campaigns || []} />
                </div>
            )}
        </div>
    );
};

export default MyPortalPage;
