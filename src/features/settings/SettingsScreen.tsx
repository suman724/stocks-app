import React, { useEffect, useState } from 'react';
import { tauriClient } from '../../services/tauriClient';

export const SettingsScreen: React.FC = () => {
    const [appVersion, setAppVersion] = useState<string>('Loading...');

    useEffect(() => {
        tauriClient.getAppVersion().then(setAppVersion).catch(console.error);
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Settings</h2>
            <p>Configure your API key and preferences here.</p>

            <div style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
                App Version: {appVersion}
            </div>
        </div>
    );
};
