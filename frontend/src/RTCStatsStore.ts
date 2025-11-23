import { create } from 'zustand'

type RTCStatsStore = {
    bitrates: Record<string, {incoming:number, outgoing:number}>;
    setUserBitrates: (userId: string, data: {incoming:number, outgoing:number}) => void;
    clearUser: (userId: string) => void;
    clear: () => void;
}

export const RTCStatsStore = create<RTCStatsStore>((set) => ({
    bitrates: {},
    setUserBitrates: (userId, {incoming, outgoing}) => set(state => ({
        bitrates: {...state.bitrates, [userId]:{incoming, outgoing}},
    })),
    clearUser: (userId: string) => set(state => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[userId]:_bye, ...rest} = state.bitrates;
        return ({bitrates:rest})
    }),
    clear: () => set(() => ({bitrates:{}})),
}))