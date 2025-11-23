import {useMediaManagement} from "./useMediaManagement.ts";
import {useRef, useState} from "react";
import {Mic, MicOff, Settings, Volume2, VolumeOff} from "lucide-react";
import {clsx} from "clsx";
import UserMediaGetter from "./UserMediaGetter.tsx";

const ControlPanel = () => {

    const {muted, setMuted, deafened, setDeafened} = useMediaManagement()
    const mutedCached = useRef<boolean>(muted);

    const [showConfig, setShowConfig] = useState<boolean>(false)

    const muteButtonOnClick = () => {
        if (muted) {
            setMuted(false);
            setDeafened(false);
        } else {
            setMuted(true)
        }
        setMuted(!muted)
    }

    const deafenButtonOnClick = () => {
        if (deafened) {
            setDeafened(false);
            setMuted(mutedCached.current);
        } else {
            setDeafened(true);
            mutedCached.current = muted;
            setMuted(true);
        }
        mutedCached.current = muted;
        setDeafened(!deafened)
    }



    return <>
    {showConfig && (<UserMediaGetter dismiss={() => setShowConfig(false)}></UserMediaGetter>)}
        <div className="flex p-2 w-fit justify-center gap-2 border-1 border-neutral-600 rounded-2xl bg-neutral-900">

            <div onClick={muteButtonOnClick} className={clsx(
                "cursor-pointer items-center justify-center flex rounded-3xl w-16 h-16 p-2",
                !muted && "hover:bg-neutral-800",
                muted && "bg-red-950",
            )}>
                {muted && <MicOff stroke="red" size="100%"></MicOff>}
                {!muted && <Mic size="100%"></Mic>}

            </div>
            <div onClick={deafenButtonOnClick} className={clsx("cursor-pointer items-center justify-center flex rounded-3xl w-16 h-16 p-2",
                !deafened && "hover:bg-neutral-800",
                deafened && "bg-red-950"
            )}>
                {deafened && <VolumeOff stroke="red" size="100%"></VolumeOff>}
                {!deafened && <Volume2 size="100%"></Volume2>}
            </div>
            <div onClick={() => setShowConfig(true)} className={"cursor-pointer items-center justify-center flex rounded-3xl w-16 h-16 p-2 hover:bg-neutral-800"}>
                <Settings size={"100%"}></Settings>
            </div>

        </div>
    </>
}

export default ControlPanel;