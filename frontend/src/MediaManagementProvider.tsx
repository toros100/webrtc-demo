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

    const [audioProcessingChains] = useState<Map<string, AudioProcessingChain>>(() => new Map());
    const [audioContext] = useState<AudioContext>(() => new AudioContext());
    const [monitorGainNode] = useState<GainNode>(() => {
        const monitorGain = audioContext.createGain()
        monitorGain.connect(audioContext.destination)
        return monitorGain;
    });
    const [masterGainNode] = useState<GainNode>(() => {
        const masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination)
        return masterGain;
    });

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
        const chain = audioProcessingChains.get(userId);
        if (chain) {
            const valClamped = Math.max(Math.min(val, MAX_GAIN), 0);
            chain.setGain(valClamped);
            setStoredGain(userId, valClamped);
        } else {
            throw new Error("userId must be registered")
        }
    }


    const getVolume = useCallback((userId: string) => {
        const chain = audioProcessingChains.get(userId);
        if (chain) {
            return chain.calculateVolume()
        } else {
            return 0
        }
    },[])


    const registerUser = useCallback((userId: string) => {
        if (audioProcessingChains.has(userId)) {
            return;
        } else {
            const chain = new AudioProcessingChain(userId, audioContext, MAX_GAIN);
            chain.setGain(useMediaStore.getState().gain[userId] ?? 1);
            if (userId === myId) {
                chain.connect(monitorGainNode);
            } else {
                chain.connect(masterGainNode)
            }
            audioProcessingChains.set(userId, chain);
        }
    },[myId]);

    const unregisterUser = useCallback((userId: string) => {
        const chain = audioProcessingChains.get(userId);
        audioProcessingChains.delete(userId);

        if (chain) {
            chain.cleanup()
        }

        useMediaStore.getState().clearUser(userId);
    },[myId])





    const registerOrUpdateAudioTrack = (userId: string, track: MediaStreamTrack) => {
        let chain = audioProcessingChains.get(userId);
        if (chain === undefined) {
            registerUser(userId)
        }
        chain = audioProcessingChains.get(userId)
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
            audioProcessingChains.get(userId)?.clearTrack()
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
            masterGainNode.disconnect()
            //masterGainNode.gain.value = 0
            //setMuted(true);
        } else {
            masterGainNode.connect(audioContext.destination)
            //masterGainNode.gain.value = 1
        }
    }, [deafened]);

    useEffect(() => {
        const t = localUserAudioTrack.current;
        if (t !== null) {
            t.enabled = !muted
        }
    }, [muted]);

    const clearUserMedia = useCallback((userIds: string[]) => {
        userIds.forEach((userId: string) => {
            unregisterUser(userId);
        })

    },[])

    const clearAllMedia = useCallback(() => {
        const userIds = Array.from(audioProcessingChains.keys());
        clearUserMedia(userIds);
        clearStore(); // defensive, should already be empty now?

    },[])

    useEffect(() => {
        /*if (!audioProcessingChains.has(myId)) {
            const chain = new AudioProcessingChain(myId, audioContext, MAX_GAIN);
            chain.connect(monitorGainNode)
            audioProcessingChains.set(myId, chain);
        }*/

        registerUser(myId)

        return clearAllMedia;
    }, []);


    return (
        <MediaManagementContext value={{
            setMonitorEnabled,
            resumeIfSuspended,
            registerOrUpdateMediaTracks,
            clearUserMedia,
            clearAllMedia,
            setAndStoreGain,
            getVolume,
            muted,
            setMuted,
            deafened,
            setDeafened
        }}>{children}</MediaManagementContext>
    )
}

