import {createContext, useContext} from "react";


type MediaManagementContext = {
    setMonitorEnabled: (enabled: boolean) => void,
    setMuted: (muted: boolean) => void,
    muted: boolean,
    deafened: boolean,
    setDeafened: (deafened: boolean) => void,
    registerOrUpdateMediaTracks: (userId:string, tracks:MediaStreamTrack[]) => void,
    clearUserMedia: (userIds: string[]) => void,
    clearAllMedia: () => void,
    resumeIfSuspended: () => void,
    setAndStoreGain: (userId: string, val: number) => void,
    getVolume: (userId: string) => number;

}

export const MediaManagementContext = createContext<MediaManagementContext|null>(null);

export const useMediaManagement = () => {

    const context = useContext(MediaManagementContext);

    if (context === null) {
        throw new Error('useMediaStorage must be used within MediaStorageProvider');
    } else return context;

}