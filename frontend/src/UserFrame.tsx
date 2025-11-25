import MediaContainer from "./MediaContainer.tsx";
import {useEffect, useRef} from "react";
import {useGlow} from "./useGlow.ts";
import {BitratesDisplay} from "./BitratesDisplay.tsx";
import {useMeetingStore} from "./useMeetingStore.ts";

const UserFrame = ({peerId, myId} : {peerId: string, myId: string}) => {

    const localUser = peerId === myId;
    const connected = useMeetingStore(state => state.userConnectionStates[peerId] === "connected");
    const reachable = useMeetingStore(state => state.usersReachable[peerId]);

    const selfRef = useRef<HTMLDivElement|null>(null);


    const {registerGlow, unregisterGlow} = useGlow()

    useEffect(() => {
        registerGlow(peerId, selfRef);

        return () => unregisterGlow(peerId);
    })



    return (
        <div className="pt-1 pb-1 aspect-square hover:border-neutral-500 transition-shadow duration-200 hover:cursor-pointer flex flex-col w-full max-h-full border-2 border-neutral-600 rounded-lg bg-black"
             ref={selfRef}
             style={{
                 boxShadow: '0 0 calc(var(--blurAmount, 0)*1px) calc(var(--spreadAmount,0) * 1px) rgba(225, 225, 235, 0.9)'
             }}>
            <div className="flex-shrink-0 truncate">
                <div className={"flex flex-row px-2"}>

                    {!localUser && connected && <div><BitratesDisplay userId={peerId}></BitratesDisplay></div>}
                    <div className={"flex-1"}></div>
                    {!localUser && !reachable && <div className={"text-red-700"}>can not reach peer</div>}

                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
                <MediaContainer userId={peerId} localUser={localUser} connected={connected}></MediaContainer>
            </div>
            <div className="flex justify-center w-full">{localUser ? "local user (you)" : "remote user"}</div>
            <div className="flex min-w-0 justify-center"><div className="truncate">{peerId}</div></div>
        </div>
    )


}

export default UserFrame;