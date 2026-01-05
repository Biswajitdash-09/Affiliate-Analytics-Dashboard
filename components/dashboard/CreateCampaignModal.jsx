"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const CreateCampaignModal = ({ isOpen, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const initialFormState = {
        name: "",
        url: "",
        payoutType: "CPA",
        payoutAmount: "",
        payoutCustom: "",
        status: "active"
    };
    const [formData, setFormData] = useState(initialFormState);

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
                duration: "lifetime",
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
                setFormData(initialFormState);
                onSuccess?.();
                onClose();
            } else {
                setError(data.error || "Failed to create campaign");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => !isSubmitting && onClose()}
            title="Create New Campaign"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
                        onClick={onClose}
                        disabled={isSubmitting}
                        type="button"
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
    );
};

export default CreateCampaignModal;
