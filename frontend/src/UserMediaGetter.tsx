import {useUserMedia} from "./useUserMedia.ts";
import ControlledCheckbox from "./ControlledCheckbox.tsx";
import {useMediaManagement} from "./useMediaManagement.ts";
import {useIdentity} from "./useIdentity.ts";
import {clsx} from "clsx";

const UserMediaGetter = ({dismiss} : {dismiss: () => void}) => {

    const {
        audioEnabled,
        setAudioEnabled,
        noiseSuppression,
        setNoiseSuppression,
        echoCancellation,
        setEchoCancellation,
        videoEnabled,
        setVideoEnabled,
        requestUserMedia,
        waiting,
        error
    } = useUserMedia()

    const {resumeIfSuspended, registerOrUpdateMediaTracks} = useMediaManagement()

    const {userId:myId} = useIdentity()
    const acceptButtonOnClick = async () => {
        await resumeIfSuspended() // audio context requires user interaction
        const localStream = await requestUserMedia();


        if (localStream === null) {
            registerOrUpdateMediaTracks(myId, [])
        } else {

            if (localStream.getAudioTracks().length > 1 || localStream.getVideoTracks().length > 1) {
                const at = localStream.getAudioTracks()[0]
                const vt = localStream.getVideoTracks()[0]
                const tracks = [at,vt].filter(t => t !== undefined)
                alert("Detected more than one track per kind (audio/video). This is not supported yet, things might break.")
                registerOrUpdateMediaTracks(myId, tracks)
            } else {
                registerOrUpdateMediaTracks(myId, localStream.getTracks())
            }

        }

    }


    return <>
        <div className="flex flex-col fixed inset-0 backdrop-blur-lg items-center justify-center z-50" onClick={dismiss}>
            <div className="w-80 border-1 border-neutral-900 bg-neutral-700 rounded-lg p-4 flex flex-col justify-center align-middle items-center"
                 onClick={(e) => e.stopPropagation()}>
                <fieldset className="flex flex-col gap-1 p-4 pt-2">
                    <legend className="font-bold">Input devices</legend>
                    <ControlledCheckbox labelText="Use microphone" state={audioEnabled} setter={setAudioEnabled}></ControlledCheckbox>
                    <fieldset className="flex flex-col ml-8">
                        <legend className={clsx("font-bold", !audioEnabled && "text-neutral-500")}>Microphone settings</legend>
                        <ControlledCheckbox disabled={!audioEnabled} labelText={"Echo cancellation"} state={echoCancellation} setter={setEchoCancellation}/>
                        <ControlledCheckbox disabled={!audioEnabled} labelText={"Noise suppression"} state={noiseSuppression} setter={setNoiseSuppression}/>
                    </fieldset>
                    <ControlledCheckbox labelText={"Use camera"} state={videoEnabled} setter={setVideoEnabled}></ControlledCheckbox>
                </fieldset>
                {error !== null && <span className="mb-2 text-xs text-red-500 max-w-full">ERROR: {error}</span>}
                <div className={"flex gap-2 w-full items-center justify-center"}>
                    <button className="btn" onClick={() => {acceptButtonOnClick()}}>{!waiting && "Request"}
                        {waiting && <div className="min-w-4 min-h-4 w-4 h-4 border-2 border-gray-300 border-t-emerald-800 rounded-full animate-spin" />}</button>
                    <button className={"btn"} onClick={dismiss}>Dismiss</button>
                </div>
                {/* <button className="btn" onClick={() => setMonitorEnabled((prev) => !prev)}>toggle monitor</button>*/}
                {/*<GainSliderRenderTest userId={myId}></GainSliderRenderTest>*/}
            </div>
        </div>
    </>
}

export default UserMediaGetter