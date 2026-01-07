"use client";

import React from 'react';

const CampaignTable = ({ campaigns }) => {
    if (!campaigns || campaigns.length === 0) {
        return (
            <div className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body items-center justify-center p-8">
                    <p className="text-base-content/50">No campaign data available.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
            <div className="card-header p-4 border-b border-base-200">
                <h3 className="font-bold text-lg">Campaign Performance</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="table">
                    {/* head */}
                    <thead className="bg-base-200/50">
                        <tr>
                            <th>Campaign</th>
                            <th className="text-center">Clicks</th>
                            <th className="text-center">Conversions</th>
                            <th className="text-center">Conv. Rate</th>
                            <th className="text-right">Revenue</th>
                            <th className="text-right">Commission</th>
                            <th className="text-right">EPC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((camp) => (
                            <tr key={camp.id} className="hover">
                                <td>
                                    <div className="flex flex-col">
                                        <span className="font-bold">{camp.name}</span>
                                        {camp.url && <span className="text-xs text-base-content/50 truncate max-w-[200px]">{camp.url}</span>}
                                    </div>
                                </td>
                                <td className="text-center font-mono">{camp.clicks}</td>
                                <td className="text-center font-mono">{camp.conversions}</td>
                                <td className="text-center">
                                    <span className={`badge badge-sm ${camp.conversionRate > 2 ? 'badge-success' : 'badge-ghost'}`}>
                                        {camp.conversionRate.toFixed(2)}%
                                    </span>
                                </td>
                                <td className="text-right font-mono text-base-content/70">₹{camp.revenue.toFixed(2)}</td>
                                <td className="text-right font-bold text-success">₹{camp.commission.toFixed(2)}</td>
                                <td className="text-right text-xs">₹{camp.epc.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CampaignTable;
