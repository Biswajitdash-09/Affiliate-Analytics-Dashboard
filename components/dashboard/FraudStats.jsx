import React from 'react';
import Icon from '@/components/Icon';

const FraudStats = ({ stats, loading }) => {
    const items = [
        {
            label: "Total Flagged Attempts",
            value: stats?.totalFraud?.toLocaleString() || "0",
            icon: "ShieldAlert",
            color: "text-error",
            bg: "bg-error/10"
        },
        {
            label: "Block Rate",
            value: `${stats?.blockRate || "0"}%`,
            icon: "Percent",
            color: "text-warning",
            bg: "bg-warning/10"
        },
        {
            label: "Clean Traffic",
            value: (stats?.totalClicks - stats?.totalFraud)?.toLocaleString() || "0",
            icon: "CheckCircle",
            color: "text-success",
            bg: "bg-success/10"
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-base-200/50 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {items.map((item, index) => (
                <div key={index} className="card bg-base-100 shadow-sm border border-base-200">
                    <div className="card-body p-6 flex-row items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-base-content/60">{item.label}</p>
                            <h3 className="text-2xl font-bold mt-1">{item.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                            <Icon name={item.icon} size={24} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FraudStats;
