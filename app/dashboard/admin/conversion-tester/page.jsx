"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Icon from "@/components/Icon";

const ConversionTesterPage = () => {
    const [clicks, setClicks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClick, setSelectedClick] = useState(null);
    const [amount, setAmount] = useState("100"); // Default amount
    const [result, setResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch clicks
    const fetchClicks = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/tools/recent-clicks");
            const data = await res.json();
            if (data.success) {
                setClicks(data.data);
            }
        } catch (error) {
            console.error("Error fetching clicks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClicks();
    }, []);

    // Handle Conversion
    const handleSimulate = async () => {
        if (!selectedClick || !amount) return;

        setIsSubmitting(true);
        setResult(null);

        try {
            const res = await fetch("/api/tracking/click", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clickId: selectedClick.clickId,
                    revenueAmount: parseFloat(amount),
                    transactionId: `test_txn_${Date.now()}`
                })
            });

            const data = await res.json();
            setResult(data);

            if (data.success) {
                // Refresh list to potentially show status change if we tracked it (optional)
                fetchClicks();
            }
        } catch (error) {
            setResult({ error: "Request failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { label: "Time", key: "createdAt", render: (getRow) => new Date(getRow.createdAt).toLocaleString() },
        { label: "Click ID", key: "clickId", render: (row) => <span className="font-mono text-xs">{row.clickId}</span> },
        { label: "Affiliate", key: "affiliateId", render: (row) => <span className="font-mono text-xs">{row.affiliateId}</span> },
        { label: "Campaign", key: "campaignId", render: (row) => <span className="font-mono text-xs">{row.campaignId}</span> },
        {
            label: "Action",
            key: "action",
            render: (row) => (
                <Button
                    size="sm"
                    variant={selectedClick?.clickId === row.clickId ? "primary" : "outline"}
                    onClick={() => {
                        setSelectedClick(row);
                        setResult(null);
                    }}
                >
                    Select
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto p-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Icon name="TestTube" className="text-primary" />
                    Conversion Tester
                </h1>
                <p className="text-base-content/60">Simulate conversions for recent clicks to test revenue tracking.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Click List */}
                <div className="lg:col-span-2">
                    <Card title="Recent Valid Clicks">
                        <div className="mb-4 flex justify-end">
                            <Button size="sm" variant="ghost" onClick={fetchClicks}>
                                <Icon name="RefreshCw" size={16} /> Refresh
                            </Button>
                        </div>
                        <Table
                            columns={columns}
                            data={clicks}
                            isLoading={isLoading}
                            emptyMessage="No recent clicks found. Generate a link and click it first!"
                        />
                    </Card>
                </div>

                {/* Simulation Form */}
                <div>
                    <div className="card bg-base-100 shadow-xl border border-primary/20 sticky top-6">
                        <div className="card-body">
                            <h2 className="card-title text-primary">Simulate Conversion</h2>

                            {!selectedClick ? (
                                <div className="py-8 text-center text-base-content/50 border-2 border-dashed border-base-200 rounded-xl">
                                    Select a click from the list <br /> to test conversion
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-base-200 p-3 rounded-lg text-sm">
                                        <p><strong>Click ID:</strong> {selectedClick.clickId}</p>
                                        <p><strong>Affiliate:</strong> {selectedClick.affiliateId}</p>
                                    </div>

                                    <Input
                                        label="Revenue Amount (₹)"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />

                                    <Button
                                        fullWidth
                                        onClick={handleSimulate}
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    >
                                        Simulate Conversion
                                    </Button>

                                    {result && (
                                        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'} text-sm mt-4`}>
                                            {result.success ? (
                                                <>
                                                    <Icon name="Check" size={16} />
                                                    <span>Success! Revenue recorded.</span>
                                                </>
                                            ) : (
                                                <span>Error: {result.error}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConversionTesterPage;
