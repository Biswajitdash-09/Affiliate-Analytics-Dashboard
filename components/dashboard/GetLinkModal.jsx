"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const GetLinkModal = ({ isOpen, onClose, campaign, affiliateId }) => {
    const [longLink, setLongLink] = useState("");
    const [shortLink, setShortLink] = useState("");
    const [isLoadingShort, setIsLoadingShort] = useState(false);
    const [copyLongSuccess, setCopyLongSuccess] = useState(false);
    const [copyShortSuccess, setCopyShortSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && campaign && affiliateId) {
            // 1. Generate Long Link
            const baseUrl = window.location.origin;
            const url = `${baseUrl}/api/tracking/click?affiliate_id=${affiliateId}&campaign_id=${campaign._id}`;
            setLongLink(url);
            setShortLink(""); // Reset short link

            // 2. Generate Short Link
            generateShortLink(affiliateId, campaign._id);
        }
    }, [isOpen, campaign, affiliateId]);

    const generateShortLink = async (affId, campId) => {
        setIsLoadingShort(true);
        try {
            const res = await fetch("/api/shortlinks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    affiliateId: affId,
                    campaignId: campId
                })
            });
            const data = await res.json();
            if (data.success) {
                setShortLink(data.data.shortUrl);
            } else {
                console.error("Short link error:", data.error);
            }
        } catch (error) {
            console.error("Failed to generate short link:", error);
        } finally {
            setIsLoadingShort(false);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md border border-base-200 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Icon name="Link" size={20} />
                        </div>
                        Get Tracking Links
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
                        <Icon name="X" size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-sm text-base-content/70">
                        Target Campaign: <span className="font-bold text-base-content">{campaign?.name}</span>
                    </div>

                    {/* Long Link Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-base-content/50 tracking-wider">
                            Standard Tracking Link
                        </label>
                        <div className="join w-full">
                            <input
                                type="text"
                                value={longLink}
                                readOnly
                                className="input input-bordered join-item w-full font-mono text-xs focus:outline-primary bg-base-200/30"
                            />
                            <Button
                                className={`join-item ${copyLongSuccess ? 'btn-success text-white' : 'btn-neutral'}`}
                                onClick={() => copyToClipboard(longLink, setCopyLongSuccess)}
                            >
                                {copyLongSuccess ? <Icon name="Check" size={16} /> : <Icon name="Copy" size={16} />}
                            </Button>
                        </div>
                    </div>

                    {/* Short Link Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-2">
                            <Icon name="Zap" size={12} /> Short Link
                        </label>
                        <div className="join w-full">
                            <input
                                type="text"
                                value={isLoadingShort ? "Generating..." : (shortLink || "Error generating link")}
                                readOnly
                                className={`input input-bordered join-item w-full font-mono text-sm focus:outline-primary ${shortLink ? 'bg-primary/5 text-primary' : ''}`}
                            />
                            <Button
                                className={`join-item ${copyShortSuccess ? 'btn-success text-white' : 'btn-primary'}`}
                                onClick={() => copyToClipboard(shortLink, setCopyShortSuccess)}
                                disabled={!shortLink || isLoadingShort}
                                isLoading={isLoadingShort}
                            >
                                {copyShortSuccess ? <Icon name="Check" size={16} /> : <Icon name="Copy" size={16} />}
                            </Button>
                        </div>
                        <p className="text-xs text-base-content/60">
                            Clean and professional link for social media.
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-base-200 bg-base-200/30 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default GetLinkModal;
