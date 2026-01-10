"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const AdminPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  // Role check - redirect affiliates to their portal
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard/my-portal');
      return;
    }
  }, [user, router]);
  
    const [activeTab, setActiveTab] = useState("adjustments");
    const [affiliates, setAffiliates] = useState([]);
    const [adjustments, setAdjustments] = useState([]);
    const [fraudLogs, setFraudLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [adjustmentForm, setAdjustmentForm] = useState({
        affiliateId: "",
        type: "commission",
        amount: "",
        reason: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [affRes, adjRes, logsRes] = await Promise.all([
                fetch("/api/affiliates"),
                fetch("/api/admin/adjustments"),
                fetch("/api/admin/logs")
            ]);

            const affData = await affRes.json();
            const adjData = await adjRes.json();
            const logsData = await logsRes.json();

            if (affData.success) setAffiliates(affData.data);
            if (adjData.success) setAdjustments(adjData.data);
            if (logsData.success) setFraudLogs(logsData.data);

        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateAdjustment = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/admin/adjustments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adjustmentForm)
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                setAdjustmentForm({ affiliateId: "", type: "commission", amount: "", reason: "" });
                fetchData();
            } else {
                alert(data.error || "Failed");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Adjustments Table Columns
    const adjustmentColumns = [
        { label: "Date", key: "createdAt", render: (row) => new Date(row.createdAt).toLocaleString() },
        { label: "Affiliate", key: "affiliateId", render: (row) => <span className="font-mono text-xs">{row.affiliateId?.slice(-8)}</span> },
        { label: "Type", key: "type", render: (row) => <span className="badge badge-outline capitalize">{row.type}</span> },
        {
            label: "Amount", key: "amount", render: (row) => (
                <span className={row.amount >= 0 ? "text-success font-bold" : "text-error font-bold"}>
                    {row.type === 'commission' ? '₹' : ''}{row.amount}
                </span>
            )
        },
        { label: "Reason", key: "reason" }
    ];

    // Fraud Logs Table Columns
    const fraudColumns = [
        { label: "Time", key: "createdAt", render: (row) => new Date(row.createdAt).toLocaleString() },
        { label: "Click ID", key: "clickId", render: (row) => <span className="font-mono text-xs">{row.clickId?.slice(-8)}</span> },
        { label: "IP", key: "ipAddress", render: (row) => <span className="font-mono text-xs">{row.ipAddress}</span> },
        {
            label: "Reason", key: "reason", render: (row) => (
                <span className="badge badge-error badge-outline text-xs">
                    {row.botDetection?.reason || 'Filtered'}
                </span>
            )
        },
        {
            label: "User Agent", key: "userAgent", render: (row) => (
                <span className="text-xs opacity-60 truncate max-w-50 block" title={row.userAgent}>
                    {row.userAgent?.slice(0, 40)}...
                </span>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
                        <Icon name="Shield" className="text-primary" size={32} />
                        Admin Panel
                    </h1>
                    <p className="text-base-content/60 mt-1">
                        Manage manual adjustments and view fraud detection logs.
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Icon name="Plus" size={18} className="mr-2" />
                    Add Adjustment
                </Button>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-boxed bg-base-100 p-1 w-fit">
                <a
                    className={`tab ${activeTab === 'adjustments' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('adjustments')}
                >
                    <Icon name="Settings" size={14} className="mr-2" />
                    Manual Adjustments
                </a>
                <a
                    className={`tab ${activeTab === 'fraud' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('fraud')}
                >
                    <Icon name="AlertTriangle" size={14} className="mr-2" />
                    Fraud Logs ({fraudLogs.length})
                </a>
            </div>

            {/* Content */}
            {activeTab === 'adjustments' ? (
                <Card>
                    <Table
                        columns={adjustmentColumns}
                        data={adjustments}
                        isLoading={isLoading}
                        emptyMessage="No adjustments recorded yet."
                    />
                </Card>
            ) : (
                <Card>
                    <Table
                        columns={fraudColumns}
                        data={fraudLogs}
                        isLoading={isLoading}
                        emptyMessage="No fraud/bot activity detected."
                    />
                </Card>
            )}

            {/* Add Adjustment Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add Manual Adjustment"
            >
                <form onSubmit={handleCreateAdjustment} className="space-y-4 mt-4">
                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Select Affiliate</span></label>
                        <select
                            className="select select-bordered w-full"
                            value={adjustmentForm.affiliateId}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, affiliateId: e.target.value })}
                            required
                        >
                            <option value="">-- Choose Affiliate --</option>
                            {affiliates.map(aff => (
                                <option key={aff.user?._id} value={aff.user?._id}>
                                    {aff.user?.name} ({aff.user?.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Adjustment Type</span></label>
                        <select
                            className="select select-bordered w-full"
                            value={adjustmentForm.type}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value })}
                        >
                            <option value="commission">Commission (₹)</option>
                            <option value="clicks">Clicks (Count)</option>
                        </select>
                    </div>

                    <Input
                        label="Amount (use negative to deduct)"
                        type="number"
                        step="0.01"
                        value={adjustmentForm.amount}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                        required
                    />

                    <Input
                        label="Reason / Notes"
                        value={adjustmentForm.reason}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                        placeholder="e.g. Bonus for Q4 performance"
                    />

                    <div className="modal-action">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Apply Adjustment</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminPage;
