import { create } from "zustand";

type MeetingStore = {
    usersConnected: Record<string, boolean>;
    replaceUsersConnected: (record: Record<string, boolean>) => void;
    userRTCStates: Record<string, RTCPeerConnectionState>;
    updateUserRTCStates: (record: Record<string, RTCPeerConnectionState>) => void;
    removeUsers: (users: string[]) => void;
    reset: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
    usersConnected: {},
    replaceUsersConnected: (record) => set(() => {
        return ({usersConnected: record})
    }),
    userRTCStates: {},
    updateUserRTCStates: (record) => set(state => {
        return ({
        userRTCStates: {
            ...state.userRTCStates,
            ...record
            }
    })}),
    removeUsers: (users) => set(state => {
        const usersConnected = Object.fromEntries(Object.entries(state.usersConnected).filter(([id,]) =>  !users.includes(id)))
        const userRTCStates = Object.fromEntries(Object.entries(state.userRTCStates).filter(([id,]) =>  !users.includes(id)))
        return {usersConnected: usersConnected, userRTCStates: userRTCStates};
    }),
    reset: () => set(() => ({
        usersConnected: {},
        userRTCStates: {},
    }))
}));