import {type ReactNode, useCallback, useEffect, useRef, useState} from "react";

import {AudioProcessingChain} from "./AudioProcessingChain.ts";
import {useMediaStore, } from "./MediaStore.ts";

import {MediaManagementContext} from "./useMediaManagement.ts";
import {useIdentity} from "./useIdentity.ts";



export const MediaManagementProvider = ({children} : {children : ReactNode}) => {

    const {userId:myId} = useIdentity();

    const [monitorEnabled, setMonitorEnabled] = useState<boolean>(false);
    const [muted, setMuted] = useState<boolean>(false);
    const [deafened, setDeafened] = useState<boolean>(false);

    const MAX_GAIN = 2;

    const audioProcessingChains = useRef<Map<string, AudioProcessingChain>>(new Map());
    const [audioContext] = useState<AudioContext>(() => new AudioContext());
    const [monitorGainNode] = useState<GainNode>(() => audioContext.createGain());
    const [masterGainNode] = useState<GainNode>(() => audioContext.createGain());

    const localUserAudioTrack = useRef<MediaStreamTrack|null>(null);


    const clearStore = useMediaStore.getState().clear
    const setStoredGain = useMediaStore.getState().setStoredGain;

    const resumeIfSuspended = () => {
        if (audioContext.state === "suspended") {
            audioContext.resume().catch((err) => {console.error("Failed to resume AudioContext", err)});
        }
    }

    const setAndStoreGain = (userId: string, val:number) => {

        if (!userId || val === null || val === undefined) {
            throw new Error("userId, val must be provided.")
        }
        const chain = audioProcessingChains.current.get(userId);
        if (chain) {
            const valClamped = Math.max(Math.min(val, MAX_GAIN), 0);
            chain.setGain(valClamped);
            setStoredGain(userId, valClamped);
        } else {
            throw new Error("userId must be registered")
        }
    }


    const getVolume = useCallback((userId: string) => {
        const chain = audioProcessingChains.current.get(userId);
        if (chain) {
            return chain.calculateVolume()
        } else {
            return 0
        }
    },[])


    const registerUser = useCallback((userId: string) => {
        if (userId === myId) {
            throw new Error("cant register own userId")
        }

        if (audioProcessingChains.current.has(userId)) {
            return;
        } else {
            const chain = new AudioProcessingChain(userId, audioContext, MAX_GAIN);
            chain.setGain(useMediaStore.getState().gain[userId] ?? 1);
            chain.connect(masterGainNode);
            audioProcessingChains.current.set(userId, chain);
        }

    },[myId]);

    const unregisterUser = useCallback((userId: string) => {
        if (userId === myId) {
            throw new Error("cant unregister own userId")
        }

        const chain = audioProcessingChains.current.get(userId);
        audioProcessingChains.current.delete(userId);

        if (chain) {
            chain.cleanup()
        }

        useMediaStore.getState().clearUser(userId);

    },[myId])



    const registerOrUpdateAudioTrack = (userId: string, track: MediaStreamTrack) => {
        let chain = audioProcessingChains.current.get(userId);
        if (chain === undefined) {
            registerUser(userId)
        }
        chain = audioProcessingChains.current.get(userId)
        chain!.registerOrUpdateTrack(track)

        if (userId === myId) {
            localUserAudioTrack.current = track;
        }

    }

    const registerOrUpdateMediaTracks = (userId: string, tracks: MediaStreamTrack[]) => {
        if (tracks.filter(t => t.kind === "audio").length > 1 || tracks.filter(t => t.kind === "video").length > 1) {
            throw new Error("currently only supporting at most one track of each kind (audio/video)")
        }
        const audioTrack = tracks.find((t) => t.kind === "audio");
        if (audioTrack === undefined) {
            audioProcessingChains.current.get(userId)?.clearTrack()
            if (userId === myId) {
                localUserAudioTrack.current = null;
            }
        } else {
            registerOrUpdateAudioTrack(userId, audioTrack)

            if (userId === myId) {
                audioTrack.enabled = !muted;
            }

        }
        useMediaStore.getState().setStoredMediaTracks(userId, tracks);
    }


    useEffect(() => {
        if (monitorEnabled) {
            monitorGainNode.connect(audioContext.destination);
            } else {
            monitorGainNode.disconnect()
        }
    }, [monitorEnabled]);


    useEffect(() => {
        if (deafened) {
            masterGainNode.gain.value = 0
            setMuted(true);
        } else {
            masterGainNode.gain.value = 1
        }
    }, [deafened]);

    useEffect(() => {
        const t = localUserAudioTrack.current;
        if (t !== null) {
            t.enabled = !muted
        }
    }, [muted]);


    useEffect(() => {
        if (!audioProcessingChains.current.has(myId)) {
            const chain = new AudioProcessingChain(myId, audioContext, MAX_GAIN);
            chain.connect(monitorGainNode)
            audioProcessingChains.current.set(myId, chain);
        }

        masterGainNode.connect(audioContext.destination);

        return clearStore;
    }, []);


    return (
        <MediaManagementContext value={{
            setMonitorEnabled,
            registerUser,
            unregisterUser,
            resumeIfSuspended,
            registerOrUpdateMediaTracks,
            setAndStoreGain,
            getVolume,
            muted,
            setMuted,
            deafened,
            setDeafened
        }}>{children}</MediaManagementContext>
    )
}

