import React from 'react';
import Table from '@/components/ui/Table';

const FlaggedEventsTable = ({ events, loading }) => {
    const columns = [
        {
            label: "Time",
            key: "createdAt",
            render: (row) => new Date(row.createdAt).toLocaleString()
        },
        {
            label: "Reason",
            key: "filterReason",
            render: (row) => (
                <span className="badge badge-error badge-sm font-medium">
                    {row.filterReason}
                </span>
            )
        },
        {
            label: "IP Address",
            key: "ipAddress",
            className: "font-mono text-xs"
        },
        {
            label: "User Agent",
            key: "userAgent",
            className: "max-w-xs truncate text-xs text-base-content/60",
            render: (row) => (
                <span title={row.userAgent}>
                    {row.userAgent}
                </span>
            )
        },
        {
            label: "Referrer",
            key: "referrer",
            className: "max-w-xs truncate text-xs text-base-content/60",
            render: (row) => row.referrer || '-'
        }
    ];

    return (
        <div className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-0">
                <div className="p-4 border-b border-base-200">
                    <h3 className="font-bold text-lg">Recent Flagged Events</h3>
                </div>
                <Table
                    columns={columns}
                    data={events}
                    isLoading={loading}
                    emptyMessage="No suspicious activity detected recently."
                    className="rounded-t-none border-none"
                />
            </div>
        </div>
    );
};

export default FlaggedEventsTable;
