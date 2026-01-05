"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

export default function LinkGenerator({ affiliateId }) {
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState("");
    const [generatedLink, setGeneratedLink] = useState("");
    const [shortLink, setShortLink] = useState("");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [copyShortSuccess, setCopyShortSuccess] = useState(false);

    useEffect(() => {
        // Fetch active campaigns
        async function fetchCampaigns() {
            try {
                const response = await fetch("/api/campaigns?status=active");
                if (response.ok) {
                    const data = await response.json();
                    setCampaigns(data.data || data);
                    if ((data.data || data).length > 0) {
                        setSelectedCampaign((data.data || data)[0]._id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch campaigns", error);
            } finally {
                setLoading(false);
            }
        }

        if (affiliateId) {
            fetchCampaigns();
        }
    }, [affiliateId]);

    const generateLink = async () => {
        if (!affiliateId) return;

        setGenerating(true);
        setCopySuccess(false);
        setCopyShortSuccess(false);

        // Base URL (client-side)
        const baseUrl = window.location.origin;

        // Construct tracking URL
        let trackingUrl = `${baseUrl}/api/tracking/click?affiliate_id=${affiliateId}`;
        if (selectedCampaign) {
            trackingUrl += `&campaign_id=${selectedCampaign}`;
        }

        setGeneratedLink(trackingUrl);

        // Also generate short link
        try {
            const res = await fetch("/api/shortlinks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    affiliateId,
                    campaignId: selectedCampaign || null
                })
            });
            const data = await res.json();
            if (data.success) {
                setShortLink(data.data.shortUrl);
            }
        } catch (err) {
            console.error("Failed to generate short link", err);
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = async (text, setSuccess) => {
        try {
            await navigator.clipboard.writeText(text);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-base-200 rounded-xl"></div>;

    return (
        <div className="card bg-base-100 border border-base-200 shadow-sm">
            <div className="card-body">
                <h2 className="card-title text-lg flex items-center gap-2 mb-4">
                    <Icon name="Link" size={20} className="text-primary" />
                    Generate Tracking Link
                </h2>

                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text font-medium">Select Campaign (Optional)</span>
                    </label>
                    <select
                        className="select select-bordered w-full focus:outline-primary"
                        value={selectedCampaign}
                        onChange={(e) => setSelectedCampaign(e.target.value)}
                    >
                        <option value="">-- No Campaign --</option>
                        {campaigns.map((camp) => (
                            <option key={camp._id} value={camp._id}>
                                {camp.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button
                        variant="primary"
                        onClick={generateLink}
                        disabled={!affiliateId || generating}
                        className="w-full sm:w-auto"
                        isLoading={generating}
                    >
                        <Icon name="Zap" size={16} className="mr-1" />
                        Generate Links
                    </Button>
                </div>

                {generatedLink && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* Full Tracking Link */}
                        <div className="p-4 bg-base-200/50 rounded-xl border border-base-200">
                            <label className="label">
                                <span className="label-text font-medium">Full Tracking Link</span>
                            </label>
                            <div className="join w-full">
                                <input
                                    type="text"
                                    className="input input-bordered join-item w-full font-mono text-xs focus:outline-primary"
                                    value={generatedLink}
                                    readOnly
                                />
                                <button
                                    className={`btn join-item ${copySuccess ? 'btn-success text-white' : 'btn-neutral'}`}
                                    onClick={() => copyToClipboard(generatedLink, setCopySuccess)}
                                >
                                    {copySuccess ? (
                                        <><Icon name="Check" size={16} /> Copied</>
                                    ) : (
                                        <><Icon name="Copy" size={16} /> Copy</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Short Link */}
                        {shortLink && (
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                                <label className="label">
                                    <span className="label-text font-medium text-primary">✨ Short Link</span>
                                </label>
                                <div className="join w-full">
                                    <input
                                        type="text"
                                        className="input input-bordered join-item w-full font-mono text-sm focus:outline-primary"
                                        value={shortLink}
                                        readOnly
                                    />
                                    <button
                                        className={`btn join-item ${copyShortSuccess ? 'btn-success text-white' : 'btn-primary'}`}
                                        onClick={() => copyToClipboard(shortLink, setCopyShortSuccess)}
                                    >
                                        {copyShortSuccess ? (
                                            <><Icon name="Check" size={16} /> Copied</>
                                        ) : (
                                            <><Icon name="Copy" size={16} /> Copy</>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-base-content/60 mt-2 ml-1">
                                    Share this short link — it's easier to remember!
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
