import React from 'react';

export const ChartPanel: React.FC = () => {
    return (
        <div style={{ padding: '20px', borderLeft: '1px solid #ccc', minHeight: '100vh' }}>
            <h2>Performance Chart</h2>
            <p>Select a symbol from your watchlist to view its performance.</p>
        </div>
    );
};
