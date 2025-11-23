import {createContext, useContext} from "react";
import type {CloseEventHandler, InfoMessageHandler, SignalingMessageHandler} from "./WebSocketProvider.tsx";
import type {OutgoingExtRTCSignalingMessage} from "./ZodSchemas.ts";

type WebSocketContext = {
    isConnected: boolean;
    prepareAndSend: (m: OutgoingExtRTCSignalingMessage) => void;
    requestInfo: () => void;
    activate: (infoCallback: InfoMessageHandler, rtcSignalCallback: SignalingMessageHandler, closeEventCallback: CloseEventHandler) => void;
    disconnect: () => void;
    connect: () => void;
    failed: boolean;
    retry: () => void;
}

export const WebSocketContext = createContext<WebSocketContext|null>(null);


export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (context === null) {
        throw new Error("Must be used within WebSocketProvider.")
    } else {
        return context;
    }
}