"use client";

import React, { useState, useEffect } from "react";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const PayoutsPage = () => {
    const [affiliates, setAffiliates] = useState([]);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending"); // pending | history

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAffiliate, setSelectedAffiliate] = useState(null);
    const [payoutForm, setPayoutForm] = useState({
        amount: "",
        method: "bank_transfer",
        transactionId: "",
        notes: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Affiliates with pending balance
            // Note: In real app, we should have specific endpoints. 
            // Re-using campaigns/affiliates endpoint or fetching all?
            // Let's use the affiliates endpoint which returns profile data incl pending_payouts
            const affRes = await fetch("/api/affiliates"); // Need to ensure we have this or similar
            const affData = await affRes.json();

            if (affData.success) {
                // Filter only those with pending > 0
                const pending = affData.data.filter(a => a.affiliateProfile?.pending_payouts > 0);
                setAffiliates(pending);
            }

            // 2. Fetch Payout History
            const histRes = await fetch("/api/payouts");
            const histData = await histRes.json();
            if (histData.success) {
                setHistory(histData.data);
            }

        } catch (error) {
            console.error("Error fetching payout data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePayClick = (affiliate) => {
        setSelectedAffiliate(affiliate);
        setPayoutForm({
            amount: affiliate.affiliateProfile.pending_payouts, // Default to full amount
            method: "bank_transfer",
            transactionId: "",
            notes: ""
        });
        setIsModalOpen(true);
    };

    const handleProcessPayout = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                affiliateId: selectedAffiliate.user._id, // User ID
                ...payoutForm
            };

            const res = await fetch("/api/payouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                fetchData(); // Refresh
            } else {
                alert(data.error || "Failed to process");
            }
        } catch (err) {
            console.error(err);
            alert("Error processing payout");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Columns for Pending Table
    const pendingColumns = [
        {
            label: "Affiliate",
            key: "name",
            render: (row) => (
                <div>
                    <div className="font-bold">{row.user?.name}</div>
                    <div className="text-xs opacity-50">{row.user?.email}</div>
                </div>
            )
        },
        {
            label: "Pending Balance",
            key: "balance",
            render: (row) => (
                <div className="font-bold text-warning">
                    ₹{row.affiliateProfile?.pending_payouts?.toFixed(2)}
                </div>
            )
        },
        {
            label: "Total Earned",
            key: "earnings",
            render: (row) => `₹${row.affiliateProfile?.total_earnings?.toFixed(2) || 0}`
        },
        {
            label: "Actions",
            key: "actions",
            render: (row) => (
                <Button size="sm" onClick={() => handlePayClick(row)}>
                    <Icon name="DollarSign" size={14} />
                    Pay
                </Button>
            )
        }
    ];

    // Columns for History Table
    const historyColumns = [
        {
            label: "Date",
            key: "createdAt",
            render: (row) => new Date(row.createdAt).toLocaleDateString()
        },
        {
            label: "Amount",
            key: "amount",
            render: (row) => <span className="text-success font-bold">₹{row.amount}</span>
        },
        {
            label: "Method",
            key: "method",
            render: (row) => <span className="badge badge-ghost capitalize">{row.method?.replace('_', ' ')}</span>
        },
        {
            label: "Ref ID",
            key: "transactionId",
            render: (row) => <span className="font-mono text-xs">{row.transactionId}</span>
        },
        {
            label: "Status",
            key: "status",
            render: (row) => <span className="badge badge-success badge-outline capitalize">{row.status}</span>
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
                        <Icon name="CreditCard" className="text-primary" size={32} />
                        Payout Management
                    </h1>
                    <p className="text-base-content/60 mt-1">
                        Review earnings and process payments to affiliates.
                    </p>
                </div>
                <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-outline btn-sm">
                        <Icon name="Download" size={16} />
                        Export Payouts
                    </label>
                    <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 rounded-box w-40 border border-base-200">
                        <li><a href="/api/export?type=csv&data=payouts" download>📄 CSV</a></li>
                        <li><a href="/api/export?type=pdf&data=payouts" download>📕 PDF</a></li>
                    </ul>
                </div>
            </div>

            <div className="tabs tabs-boxed bg-base-100 p-1 w-fit">
                <a
                    className={`tab ${activeTab === 'pending' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Payouts
                </a>
                <a
                    className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Payout History
                </a>
            </div>

            {activeTab === 'pending' ? (
                <div className="card bg-base-100 shadow-sm border border-base-200">
                    <div className="card-body p-0">
                        <Table
                            columns={pendingColumns}
                            data={affiliates}
                            isLoading={isLoading}
                            emptyMessage="No affiliates with pending balances."
                        />
                    </div>
                </div>
            ) : (
                <div className="card bg-base-100 shadow-sm border border-base-200">
                    <div className="card-body p-0">
                        <Table
                            columns={historyColumns}
                            data={history}
                            isLoading={isLoading}
                            emptyMessage="No payout history found."
                        />
                    </div>
                </div>
            )}

            {/* Process Payout Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Process Payout for ${selectedAffiliate?.user?.name}`}
            >
                <form onSubmit={handleProcessPayout} className="space-y-4 mt-4">
                    <div className="p-4 bg-base-200 rounded-lg">
                        <div className="text-sm opacity-70">Current Pending Balance</div>
                        <div className="text-2xl font-bold text-primary">
                            ₹{selectedAffiliate?.affiliateProfile?.pending_payouts?.toFixed(2)}
                        </div>
                    </div>

                    <Input
                        label="Payout Amount"
                        type="number"
                        value={payoutForm.amount}
                        onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                        required
                    />

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Payment Method</span></label>
                        <select
                            className="select select-bordered"
                            value={payoutForm.method}
                            onChange={e => setPayoutForm({ ...payoutForm, method: e.target.value })}
                        >
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="paypal">PayPal</option>
                            <option value="upi">UPI</option>
                            <option value="cash">Cash / Cheque</option>
                        </select>
                    </div>

                    <Input
                        label="Transaction Reference ID"
                        placeholder="e.g. UPI Ref, Bank UTR"
                        value={payoutForm.transactionId}
                        onChange={e => setPayoutForm({ ...payoutForm, transactionId: e.target.value })}
                        required
                    />

                    <Input
                        label="Notes"
                        value={payoutForm.notes}
                        onChange={e => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                    />

                    <div className="modal-action">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Confirm Payout</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PayoutsPage;
