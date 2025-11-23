import {createContext, type Dispatch, type SetStateAction, useContext} from "react";


type UserMediaContext = {
    error: string | null;
    waiting: boolean;
    audioEnabled: boolean;
    setAudioEnabled: Dispatch<SetStateAction<boolean>>;
    videoEnabled: boolean;
    setVideoEnabled: Dispatch<SetStateAction<boolean>>;
    noiseSuppression: boolean;
    setNoiseSuppression: Dispatch<SetStateAction<boolean>>;
    echoCancellation: boolean;
    setEchoCancellation: Dispatch<SetStateAction<boolean>>;
    requestUserMedia: () => Promise<MediaStream | null>;

}

export const UserMediaContext = createContext<UserMediaContext|null>(null);

export const useUserMedia = () => {
    const context = useContext(UserMediaContext);

    if (!context) {
        throw new Error("Must be used inside UserMediaProvider")
    } else {
        return context;
    }

}