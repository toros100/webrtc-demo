import {UserMediaContext} from "./useUserMedia.ts";
import {type ReactNode, useCallback, useState} from "react";

const UserMediaProvider = ({children} : {children: ReactNode}) => {

    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(false);

    const [echoCancellation, setEchoCancellation] = useState(false);
    const [noiseSuppression, setNoiseSuppression] = useState(true);

    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState<string|null>(null);

    const requestUserMedia = useCallback(async () => {

        setWaiting(true);
        setError(null);

        const constraints = {
            audio: audioEnabled ? {echoCancellation, noiseSuppression} : false,
            video: videoEnabled ? {aspectRatio: 4/3, width:800 , height: 600} : false
        }

        if (!audioEnabled && !videoEnabled) {
            setWaiting(false)
            return null;
        } else {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                const err = e as Error;
                setError(err.name + " " + err.message)
                return null
            } finally {
                setWaiting(false);
            }
        }

    },[audioEnabled, videoEnabled, echoCancellation,noiseSuppression]);

    return (<UserMediaContext value={{
        requestUserMedia,
        error,
        waiting,
        audioEnabled,
        setAudioEnabled,
        echoCancellation,
        setEchoCancellation,
        noiseSuppression,
        setNoiseSuppression,
        videoEnabled,
        setVideoEnabled
    }}>{children}</UserMediaContext>)
}

export default UserMediaProvider;