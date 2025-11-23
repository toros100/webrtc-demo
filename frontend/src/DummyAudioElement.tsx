import {useEffect, useRef, useState} from "react";
import {useMediaStore} from "./MediaStore.ts";

const DummyAudioElement = ({userId} : {userId : string}) => {

    // dummy audio elements for each remote stream because some browsers (chrome) are a bit weird with streams received from webrtc

    const [remoteStream, setRemoteStream] = useState<MediaStream|null>(null);
    const audioElementRef = useRef<HTMLMediaElement | null>(null);

    useEffect(() => {
        return useMediaStore.subscribe(state => {
            const str = state.remoteStream[userId] ?? null

            if (str !== remoteStream) {
                setRemoteStream(state.remoteStream[userId] ?? null);
            }
        })

    }, [])

    useEffect(() => {

        if (audioElementRef.current) {
            audioElementRef.current.srcObject = remoteStream;
        }

    }, [remoteStream]);


    return <audio autoPlay={false} controls={false} muted={true} ref={audioElementRef}></audio>;
}

export default DummyAudioElement