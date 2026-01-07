"use client";

import React from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const AnalyticsChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center bg-base-100 border border-base-200 rounded-xl">
                <p className="text-base-content/50">No data available yet</p>
            </div>
        );
    }

    // Calculate suitable Y-axis max for better scaling
    const maxClicks = Math.max(...data.map(d => d.clicks || 0), 10);
    const maxEarnings = Math.max(...data.map(d => d.earnings || 0), 100);

    return (
        <div className="h-[350px] w-full bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Performance Trends (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    }}
                >
                    <CartesianGrid stroke="#f5f5f5" vertical={false} />
                    <XAxis
                        dataKey="date"
                        scale="point"
                        tick={{ fontSize: 12, fill: '#666' }}
                        tickFormatter={(date) => {
                            const d = new Date(date);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                    />
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        tick={{ fontSize: 12, fill: '#666' }}
                        label={{ value: 'Earnings (₹)', angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#666' }}
                        label={{ value: 'Clicks', angle: 90, position: 'insideRight', style: { fill: '#666' } }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(date) => {
                            const d = new Date(date);
                            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
                        }}
                    />
                    <Legend />
                    <Bar yAxisId="right" dataKey="clicks" name="Clicks" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="earnings" name="Earnings" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AnalyticsChart;
