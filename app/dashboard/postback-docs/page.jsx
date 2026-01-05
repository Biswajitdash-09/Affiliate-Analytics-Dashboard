"use client";

import React from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/Icon";

const PostbackDocsPage = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
                    <Icon name="Webhook" className="text-primary" size={32} />
                    Postback Integration
                </h1>
                <p className="text-base-content/60 mt-1">
                    Server-to-server (S2S) conversion tracking documentation.
                </p>
            </div>

            <Card title="Postback URL Format" icon="Link">
                <div className="mockup-code bg-neutral text-neutral-content p-4 rounded-lg text-sm overflow-x-auto">
                    <pre><code>{`GET ${baseUrl}/api/postback?click_id={click_id}&amount={amount}`}</code></pre>
                </div>
            </Card>

            <Card title="Parameters" icon="Settings">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Parameter</th>
                                <th>Required</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code className="badge badge-ghost">click_id</code></td>
                                <td><span className="badge badge-error badge-sm">Required</span></td>
                                <td>The click ID returned when the user clicked the tracking link</td>
                            </tr>
                            <tr>
                                <td><code className="badge badge-ghost">amount</code></td>
                                <td><span className="badge badge-warning badge-sm">Optional</span></td>
                                <td>Transaction amount (default: 0)</td>
                            </tr>
                            <tr>
                                <td><code className="badge badge-ghost">currency</code></td>
                                <td><span className="badge badge-warning badge-sm">Optional</span></td>
                                <td>Currency code (default: INR)</td>
                            </tr>
                            <tr>
                                <td><code className="badge badge-ghost">status</code></td>
                                <td><span className="badge badge-warning badge-sm">Optional</span></td>
                                <td>"success" or "pending" (default: success)</td>
                            </tr>
                            <tr>
                                <td><code className="badge badge-ghost">payout</code></td>
                                <td><span className="badge badge-warning badge-sm">Optional</span></td>
                                <td>Override commission amount</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Example Request" icon="Code">
                <div className="mockup-code bg-neutral text-neutral-content p-4 rounded-lg text-sm overflow-x-auto">
                    <pre><code>{`curl "${baseUrl}/api/postback?click_id=abc123&amount=999&currency=INR&status=success"`}</code></pre>
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium">Response:</p>
                    <div className="mockup-code bg-base-200 p-4 rounded-lg text-sm mt-2">
                        <pre><code>{`{
  "success": true,
  "message": "Conversion recorded",
  "data": {
    "clickId": "abc123",
    "affiliateId": "...",
    "amount": 999,
    "commission": 99.9
  }
}`}</code></pre>
                    </div>
                </div>
            </Card>

            <div className="alert alert-info">
                <Icon name="Info" size={20} />
                <span>
                    The <code>click_id</code> is stored in the user's browser (localStorage/cookie) when they click an affiliate link.
                    Pass this ID from your checkout/conversion page to your server, then call this postback URL.
                </span>
            </div>
        </div>
    );
};

export default PostbackDocsPage;
