import {RTCStatsStore} from "./RTCStatsStore.ts";
import {useShallow} from "zustand/react/shallow";
import {ArrowLeftRight} from "lucide-react";

export const BitratesDisplay = ({userId} : {userId: string}) => {

    const {incoming, outgoing} = RTCStatsStore(useShallow(state => state.bitrates[userId])) ?? {incoming: 0, outgoing: 0};

    return (
        <div className="flex flex-row">
            <ArrowLeftRight size="2rem"></ArrowLeftRight>
            <div className="mx-2 font-mono text-xs">in: {incoming} kbit/s <br/> out: {outgoing} kbit/s</div>
        </div>
    )
}