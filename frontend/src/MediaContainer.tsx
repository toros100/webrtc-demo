import {useEffect, useRef, useState} from "react";
import {useMediaStore} from "./MediaStore.ts";
import {useShallow} from "zustand/react/shallow";
import {Headphones, Mic} from "lucide-react";

const MediaContainer = ({userId, localUser, connected} : {userId: string, localUser: boolean, connected: boolean}) => {

    const [videoStream] = useState(() => new MediaStream());
    const videoElement = useRef<HTMLVideoElement|null>(null)
    const [currentVideoTrack, setCurrentVideoTrack] = useState<MediaStreamTrack | null>(null)

    const mediaTracks = useMediaStore(useShallow(state => state.mediaTracks[userId]))
    const videoTrack = mediaTracks?.find((track) => track.kind === "video") ?? null
    const audioTrack = mediaTracks?.find((track) => track.kind === "audio") ?? null



    if (videoTrack !== currentVideoTrack) {
        if (currentVideoTrack !== null) {
            videoStream.removeTrack(currentVideoTrack)
        }
        if (videoTrack !== null) {
            videoStream.addTrack(videoTrack)
        }
        setCurrentVideoTrack(videoTrack)
    }


    useEffect(() => {
        if (videoElement.current !== null) {
            videoElement.current.srcObject = videoStream
        }
    }, [currentVideoTrack]);


    // todo: this is an absolute mess, need to refactor, probably extract into indicator component

    if (!localUser && !connected) {
        return(
            <div className="flex justify-center items-center max-h-full max-w-full h-full w-full">
                    <div className="inline-block h-14 w-14 animate-spin rounded-full border-2 border-solid border-neutral-50 border-r-transparent"></div>
            </div>)
    }


    if (videoTrack !== null) {
        return (
            <div className="flex justify-center items-center bg-black h-full w-full overflow-hidden">
                <video className="object-contain h-full w-full" disablePictureInPicture ref={videoElement}
                       autoPlay
                       muted={true}></video>
            </div>

        );
    } else if (audioTrack !== null) {
        return (
            <div className="flex justify-center items-center max-h-full max-w-full h-full w-full">
                <div className="w-1/6">
                <Mic size="100%" stroke="#e5e5e5"></Mic>
                </div>
            </div>
        )
    } else {
        return (
            <div className="flex justify-center items-center max-h-full max-w-full h-full w-full">
                <div className="w-1/6">
                <Headphones size="100%" stroke="#e5e5e5"></Headphones>
                </div>
            </div>
        )
    }
}

export default MediaContainer