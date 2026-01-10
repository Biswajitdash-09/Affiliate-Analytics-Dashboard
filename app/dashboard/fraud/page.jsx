"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import Card from '@/components/ui/Card';
import Icon from '@/components/Icon';
import FraudStats from '@/components/dashboard/FraudStats';
import FlaggedEventsTable from '@/components/dashboard/FlaggedEventsTable';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1'];

const FraudPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  // Role check - redirect affiliates to their portal
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard/my-portal');
      return;
    }
  }, [user, router]);
    const [data, setData] = useState({
        effectiveness: { totalClicks: 0, totalFraud: 0, blockRate: 0 },
        fraudByReason: [],
        topOffenders: [],
        recentEvents: [],
        dailyTrend: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFraudStats();
    }, []);

    const fetchFraudStats = async () => {
        try {
            const res = await fetch('/api/admin/fraud');
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (err) {
            console.error("Failed to fetch fraud stats", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Icon name="ShieldAlert" className="text-error" size={32} />
                        Fraud Detection & Prevention
                    </h1>
                    <p className="text-base-content/60 mt-1">
                        Monitor blocked bot traffic and suspicious activities.
                    </p>
                </div>
                <button
                    onClick={fetchFraudStats}
                    className="btn btn-ghost btn-sm"
                >
                    <Icon name="RefreshCw" size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <FraudStats stats={data.effectiveness} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fraud By Reason Pie Chart */}
                <Card>
                    <h3 className="font-bold text-lg mb-4">Blocked Reasons</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.fraudByReason}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.fraudByReason.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Daily Trend Bar Chart */}
                <Card>
                    <h3 className="font-bold text-lg mb-4">Daily Flagged Attempts</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.dailyTrend}>
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Offenders List */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Icon name="AlertTriangle" size={18} className="text-warning" />
                            Top Offenders (IP)
                        </h3>
                        <div className="space-y-3">
                            {data.topOffenders.map((offender, i) => (
                                <div key={i} className="flex items-center justify-between p-2 hover:bg-base-200/50 rounded-lg">
                                    <div>
                                        <div className="font-mono text-sm font-medium">{offender.ip}</div>
                                        <div className="text-xs text-base-content/50">
                                            {offender.reasons.join(', ')}
                                        </div>
                                    </div>
                                    <div className="badge badge-ghost font-bold">{offender.count}</div>
                                </div>
                            ))}
                            {data.topOffenders.length === 0 && (
                                <p className="text-sm text-base-content/50 text-center py-4">No top offenders yet.</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Recent Events Table */}
                <div className="lg:col-span-2">
                    <FlaggedEventsTable events={data.recentEvents} loading={loading} />
                </div>
            </div>
        </div>
    );
};

export default FraudPage;
