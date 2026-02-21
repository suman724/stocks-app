import { invoke } from '@tauri-apps/api/core';

export const tauriClient = {
    getAppVersion: async (): Promise<string> => {
        return await invoke<string>('get_app_version');
    },
};
