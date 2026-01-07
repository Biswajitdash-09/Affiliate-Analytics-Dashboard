"use client";

import React from 'react';
import { FunnelChart, Funnel, Tooltip, LabelList, ResponsiveContainer, Cell } from 'recharts';
import Icon from '@/components/Icon';

const FunnelChartComponent = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-base-content/40">
                <Icon name="Filter" size={32} className="mb-2 opacity-50" />
                <p>No funnel data available</p>
            </div>
        );
    }

    // Calculate Conversion Rate
    const clicks = data.find(d => d.name === 'Clicks')?.value || 0;
    const conversions = data.find(d => d.name === 'Conversions')?.value || 0;
    const conversionRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0;

    return (
        <div className="w-full h-full min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
                <div>
                    <h4 className="text-sm font-medium text-base-content/70 uppercase tracking-wider">Conversion Funnel</h4>
                    <div className="text-2xl font-bold text-base-content">{conversionRate}% <span className="text-xs font-normal text-base-content/50">Conv. Rate</span></div>
                </div>
            </div>

            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--b1))',
                                borderColor: 'hsl(var(--b2))',
                                borderRadius: '0.75rem',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            formatter={(value) => [value, 'Count']}
                        />
                        <Funnel
                            dataKey="value"
                            data={data}
                            isAnimationActive
                        >
                            <LabelList position="right" fill="currentColor" stroke="none" dataKey="name" />
                            <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
                            {/* Cells are handled by data fill property */}
                        </Funnel>
                    </FunnelChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-base-200">
                <div className="text-center">
                    <div className="text-xs text-base-content/60">Total Clicks</div>
                    <div className="font-bold text-primary">{clicks}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-base-content/60">Total Conversions</div>
                    <div className="font-bold text-success">{conversions}</div>
                </div>
            </div>
        </div>
    );
};

export default FunnelChartComponent;
