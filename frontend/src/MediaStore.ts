import { create } from "zustand"

type MediaStore = {
    mediaTracks: Record<string,MediaStreamTrack[]>;
    gain: Record<string,number>;
    remoteStream: Record<string, MediaStream>
    setStoredMediaTracks: (userId: string, tracks: MediaStreamTrack[]) => void;
    registerOrUpdateRemoteStream: (userId: string, stream: MediaStream) => void;
    setStoredGain: (userId:string, gainVal: number) => void;
    clearUser: (userId: string) => void;
    clear: () => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
    mediaTracks: {},
    setStoredMediaTracks: (userId, tracks) => set(state => ({mediaTracks: {...state.mediaTracks, [userId]:tracks}}),),
    gain: {},
    remoteStream: {},
    setStoredGain: (userId, gainVal) => {
        set((state) => ({gain: {...state.gain, [userId]: gainVal}}))
    },
    registerOrUpdateRemoteStream: (userId: string, stream: MediaStream) => {
        set((state) => ({remoteStream : {...state.remoteStream, [userId]: stream}}))
    },
    clearUser: (userId: string) => set((state) => {

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[userId]:_tracks, ...restTracks} = state.mediaTracks;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[userId]:_stream, ...restStreams} = state.remoteStream;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[userId]:_gain, ...restGain} = state.gain;

        return ({mediaTracks: restTracks, gain: restGain, remoteStream: restStreams})

    }) ,
    clear: () => {
        set(() => ({mediaTracks: {}, gain: {}, remoteStream: {}}))
    },


}))

