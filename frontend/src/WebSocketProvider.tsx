import {useEffect, useRef, useState, useCallback, type ReactNode} from "react";
import {WebSocketContext} from "./useWebSocket.ts";
import {
    type ExtRTCSignalingMessage,
    EnvelopeSchema, InfoUnwrapSchema, SignalUnwrapSchema,
    type InfoMessage, type OutgoingExtRTCSignalingMessage
} from "./ZodSchemas";

export type InfoMessageHandler = (m: InfoMessage) => void;
export type SignalingMessageHandler = (m: ExtRTCSignalingMessage) => void;
export type CloseEventHandler = (e: CloseEvent) => void;

export default function WebSocketProvider({meetingId, children} : {meetingId:string, myId:string, children:ReactNode}) {

    const webSocketRef = useRef<WebSocket|null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const infoCallback = useRef<InfoMessageHandler|null>(null) // callback for info messages, given on activation
    const rtcSignalCallback = useRef<SignalingMessageHandler|null>(null)
    const closedEventCallback = useRef<CloseEventHandler|null>(null) // callback for handling ws errors

    const maxReconnectAttempts = 3;
    const reconnectAttempts = useRef<number>(0)
    const [failed, setFailed] = useState<boolean>(false);

    const connect = useCallback(() => {
        console.log("connecting ws...")
        if (webSocketRef.current?.readyState === WebSocket.CONNECTING
            || webSocketRef.current?.readyState === WebSocket.OPEN) {
            console.log("was already connected or connecting.")
            return;
        }
        const ws = new WebSocket("/wsr/"+meetingId);

        webSocketRef.current = ws

        ws.onopen = () => {
            console.log("successfully connected ws!")
            setIsConnected(true)
            requestInfo()
        }

        ws.onclose = (event) => {
            setIsConnected(false);
            webSocketRef.current = null
            ws.onopen = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.onclose = null;

            const callback = closedEventCallback.current;
            if (callback === null) {
                console.error("missed close event, no callback registered")
            } else {
                callback(event)
            }

            if (event.code < 4000 && reconnectAttempts.current < maxReconnectAttempts) {
                reconnectAttempts.current += 1;
                connect()
            } else {
                setFailed(true);
            }
        }


        ws.onerror = (event) => {
            console.error("[WS] error event", event)
        }

        ws.onmessage = (event) => {

            let d;
            try {
                d = JSON.parse(event.data);
            } catch (error) {
                console.error("[WS] Error parsing JSON", error)
                return
            }
            try {
                const env = EnvelopeSchema.parse(d);
                if (env.kind === "info") {
                    const info = InfoUnwrapSchema.parse(d);
                    if (infoCallback.current !== null) {
                        infoCallback.current(info)
                    } else console.error("[WS] Received \"info\" message without callback registered")
                } else if (env.kind === "signal") {
                    const sig = SignalUnwrapSchema.parse(d)
                    if (rtcSignalCallback.current !== null) {
                        rtcSignalCallback.current(sig)
                    } else console.error("[WS] Received \"signal\" message without callback registered")
                }
            } catch (e) {
                const err = e as Error;
                console.error("[WS] Error parsing received message:", err.name)
            }

        }
    }, [meetingId])


    const retry = useCallback(() => {
        setFailed(false);
        reconnectAttempts.current = 0;
        connect()
    },[])

    const disconnect = useCallback(() => {
        webSocketRef.current?.close()
        setIsConnected(false)
    },[])

    const activate = useCallback((i: InfoMessageHandler, r: SignalingMessageHandler, h: CloseEventHandler) => {
        infoCallback.current = i;
        rtcSignalCallback.current = r;
        closedEventCallback.current = h;
        connect()
    },[])

    const requestInfo = useCallback(() => {
        try {
            send(JSON.stringify({kind: "requestInfo"}))
        } catch (error) {
            console.error("Error requesting info:", error)
        }

    }, [])

    const prepareAndSend = useCallback((message: OutgoingExtRTCSignalingMessage) => {
        const {to, from, ...rest} = message;
        try {
            const payload = JSON.stringify(rest)
            const m = {
                to: to,
                from: from,
                kind: "signal",
                payload: payload
            }

            const out = JSON.stringify(m)
            send(out)
        } catch (error) {
            console.error("Error sending WS message:", error);
        }

    }, [])

    const send = useCallback((message: string): boolean => {
        if (webSocketRef?.current?.readyState === WebSocket.OPEN) {
            try {
                webSocketRef.current.send(message)
                return true;
            } catch (err) {
                console.error("Error sending WS message", err)
                return false;
            }
        } else {
            return false;
        }
    }, [])

    useEffect(() => {
        return () => {
            const ws = webSocketRef.current
            infoCallback.current = null;
            rtcSignalCallback.current = null;
            closedEventCallback.current = null;
            if (ws) {
                ws.close();
            }
        }
    }, [])

    return (<WebSocketContext value={{ prepareAndSend, failed, retry, requestInfo, activate, isConnected, connect, disconnect}}>
        {children}
    </WebSocketContext>);

}
