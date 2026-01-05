"use client";

import React, { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/Icon";

const IntegrationPage = () => {
    const [copied, setCopied] = useState(false);

    const scriptCode = `<!-- AffiliatePro Tracking Code -->
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/tracking.js" async></script>`;

    const conversionCode = `// Call this when a purchase/action completes
Affiliate.conversion({
  amount: 100.00,  // Purchase amount
  transactionId: 'ORDER_123', // Unique Order ID
  currency: 'INR' // Optional
});`;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
                    <Icon name="Code" className="text-primary" size={32} />
                    Integration
                </h1>
                <p className="text-base-content/60 mt-1">
                    Connect your external websites and applications to the tracking system.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Step 1: Client Script */}
                <Card title="Step 1: Add Tracking Script" icon="Globe">
                    <p className="mb-4 text-sm text-base-content/70">
                        Add this script to the <code>&lt;head&gt;</code> of every page on your website.
                        This automatically parses affiliate links and stores attribution data.
                    </p>

                    <div className="relative group">
                        <div className="mockup-code bg-neutral text-neutral-content p-4 rounded-lg text-sm overflow-x-auto">
                            <pre><code>{scriptCode}</code></pre>
                        </div>
                        <button
                            onClick={() => handleCopy(scriptCode)}
                            className="absolute top-2 right-2 btn btn-sm btn-ghost bg-base-100/10 text-white hover:bg-base-100/20"
                        >
                            <Icon name="Copy" size={14} />
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>

                    <div className="mt-4 bg-base-200/50 p-4 rounded-lg flex gap-3 text-sm">
                        <Icon name="Info" className="text-info shrink-0" size={18} />
                        <div>
                            <p className="font-bold">How it works:</p>
                            <ul className="list-disc list-inside mt-1 opacity-80 space-y-1">
                                <li>Detects <code>?affiliate_id=...</code> in URLs.</li>
                                <li>Logs clicks to the server automatically.</li>
                                <li>Stores a cookie <code>aff_click_id</code> for 30 days.</li>
                            </ul>
                        </div>
                    </div>
                </Card>

                {/* Step 2: Conversion Event */}
                <Card title="Step 2: Track Conversions" icon="CheckCircle">
                    <p className="mb-4 text-sm text-base-content/70">
                        To track sales or leads, call the <code>Affiliate.conversion()</code> method when a successful action occurs (e.g., on your "Thank You" page).
                    </p>

                    <div className="relative group">
                        <div className="mockup-code bg-neutral text-neutral-content p-4 rounded-lg text-sm overflow-x-auto">
                            <pre><code>{conversionCode}</code></pre>
                        </div>
                        <button
                            onClick={() => handleCopy(conversionCode)}
                            className="absolute top-2 right-2 btn btn-sm btn-ghost bg-base-100/10 text-white hover:bg-base-100/20"
                        >
                            <Icon name="Copy" size={14} />
                            Copy
                        </button>
                    </div>

                    <div className="mt-4 bg-warning/10 text-warning-content p-4 rounded-lg flex gap-3 text-sm border border-warning/20">
                        <Icon name="AlertTriangle" className="shrink-0" size={18} />
                        <p>
                            Ensure the user is on the same domain or device where they clicked the link,
                            otherwise the cookie might not be found. For cross-device tracking, use Server-side Integration.
                        </p>
                    </div>
                </Card>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body">
                    <h3 className="font-bold text-lg">Server-side Integration (Advanced)</h3>
                    <p className="text-sm text-base-content/70 mb-4">
                        For more reliable tracking (Stripe Webhooks, PayPal IPN), use our API endpoints directly.
                    </p>

                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full text-sm">
                            <thead>
                                <tr>
                                    <th>Endpoint</th>
                                    <th>Method</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="font-mono">/api/tracking/click</td>
                                    <td><span className="badge badge-ghost">POST</span></td>
                                    <td>Log a click event. Returns <code>clickId</code>.</td>
                                </tr>
                                <tr>
                                    <td className="font-mono">/api/tracking/click</td>
                                    <td><span className="badge badge-secondary badge-outline">PUT</span></td>
                                    <td>Record a conversion. Requires <code>clickId</code>.</td>
                                </tr>
                                <tr>
                                    <td className="font-mono">/api/webhooks/stripe</td>
                                    <td><span className="badge badge-primary badge-outline">POST</span></td>
                                    <td>Handle Stripe checkout events automatically.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationPage;
