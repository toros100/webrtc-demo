import { create } from "zustand";
import type {ConnectionState} from "./WebRTCConnectionManager.ts";


type MeetingStore = {
    usersReachable: Record<string, boolean>;
    replaceUsersReachable: (record: Record<string, boolean>) => void;
    userConnectionStates: Record<string, ConnectionState>;
    updateUserConnectionState: (userId:string, st: ConnectionState) => void;
    removeUsers: (users: string[]) => void;
    clear: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
    usersReachable: {},
    replaceUsersReachable: (record) => set(() => {
        return ({usersReachable: record})
    }),
    userConnectionStates: {},
    updateUserConnectionState: (userId, st) => set(state => {
        return ({userConnectionStates: ({...state.userConnectionStates, [userId]: st})})
    }),
    removeUsers: (users) => set(state => {
        const usersReachable = Object.fromEntries(Object.entries(state.usersReachable).filter(([id,]) =>  !users.includes(id)))
        const userConnectionStates = Object.fromEntries(Object.entries(state.userConnectionStates).filter(([id,]) =>  !users.includes(id)))
        return {usersReachable: usersReachable, userConnectionStates: userConnectionStates};
    }),
    clear: () => set(() => ({
        usersReachable: {},
        userConnectionStates: {},
    }))
}));