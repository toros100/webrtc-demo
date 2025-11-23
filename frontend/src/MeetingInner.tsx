import { useEffect, useRef, useState } from "react";
import {useWebSocket} from "./useWebSocket.ts";
import WebSocketStatus from "./WebSocketStatus";
import type {InfoMessage} from "./ZodSchemas";
import DummyAudioElement from "./DummyAudioElement.tsx";
import { useMeetingStore } from "./useMeetingStore";
import UserFrame from "./UserFrame.tsx";
import {WebRTCConnectionManager} from "./WebRTCConnectionManager.ts";
import {useShallow} from "zustand/react/shallow";
import {useMediaStore} from "./MediaStore.ts";
import {useMediaManagement} from "./useMediaManagement.ts";
import {LayoutGroup, motion} from "motion/react";
import {RTCStatsStore} from "./RTCStatsStore.ts";
import {useTurnCredentials} from "./useTurnCredentials.ts";
import ControlPanel from "./ControlPanel.tsx";

export default function MeetingInner({myId, setInMeeting} : {myId:string, setInMeeting : (b: boolean) => void}) {

    const m = useRef<null|WebRTCConnectionManager>(null);

    const participants = useMeetingStore(useShallow(state => Object.keys(state.usersConnected)))

    const {activate, prepareAndSend, isConnected, requestInfo} = useWebSocket();


    if (m.current) {
        m.current.setConnectedToSignaling(isConnected)
    }

    const {credentials} = useTurnCredentials();
    const [focusedUser, setFocusedUser] = useState<string | null>(null);
    const {registerOrUpdateMediaTracks} = useMediaManagement()


    useEffect(() => {
        if (!m.current) {
            m.current = new WebRTCConnectionManager(myId, prepareAndSend, requestInfo, credentials);
            m.current.setConnectedToSignaling(isConnected)

            // @ts-expect-error so i can access the manager in the console for poking around
            window.rtcmanager = m.current;

            m.current.onTrack = (userId, _track, streams) => {

                const stream = streams[0];
                const prevStream = useMediaStore.getState().remoteStream[userId]
                registerOrUpdateMediaTracks(userId, stream.getTracks())

                if (stream.id !== prevStream?.id) {
                    useMediaStore.getState().registerOrUpdateRemoteStream(userId, stream);
                    stream.onremovetrack = () => {
                        if (stream === useMediaStore.getState().remoteStream[userId]) {
                            registerOrUpdateMediaTracks(userId, stream.getTracks())
                        } else {
                            stream.onremovetrack = null
                        }
                    }
                }
            }
        }

        m.current.onConnectionStateChange = (userId:string, connectionState: RTCPeerConnectionState) => {
            const record = {[userId]: connectionState} as Record<string, RTCPeerConnectionState>;
            useMeetingStore.getState().updateUserRTCStates(record)
        }

        m.current.onBitratesCalculated = (userId: string, {incoming, outgoing}) => {
            RTCStatsStore.getState().setUserBitrates(userId, {incoming, outgoing})
        }

        m.current.onDisconnect = (userId: string) => {
            useMediaStore.getState().setStoredMediaTracks(userId, [])
        }

        const initialParticipants = Object.keys(useMeetingStore.getState().usersConnected)
        initialParticipants.forEach((userId) => {
            if (userId !== myId) {
                const peerConnectedToSignaling = useMeetingStore.getState().usersConnected[userId]
                m.current!.registerPeer(userId, peerConnectedToSignaling)
            }

        })

        const usersDiff = (previousUsers: string[], currentUsers: string[]) => {
            return {
                joined: currentUsers.filter(userId => !previousUsers.includes(userId)),
                left: previousUsers.filter(userId => !currentUsers.includes(userId)),
            }
        }

        const initialTracks = useMediaStore.getState().mediaTracks[myId] ?? []
        m.current.setInputTracks(initialTracks);

        const unsubscribeMediaStore = useMediaStore.subscribe((state) => {
            m.current?.setInputTracks(state.mediaTracks[myId] ?? []);
        })

        const unsubscribeMeetingStore = useMeetingStore.subscribe((state, prevState) => {

            const {joined, left} = usersDiff(Object.keys(prevState.usersConnected), Object.keys(state.usersConnected));

            joined.forEach(userId => {
                if (userId !== myId) {
                    const peerConnected = state.usersConnected[userId];
                    m.current!.registerPeer(userId, peerConnected)
                }
            });
            if (left.length > 0) {
                left.forEach(userId => m.current?.unregisterPeer(userId));
                useMeetingStore.getState().removeUsers(left)

            }

            Object.keys(state.usersConnected).forEach((userId) => {
                if (userId !== myId) {
                    const peerConnected = state.usersConnected[userId];
                    m.current?.setPeerConnectedToSignaling(userId, peerConnected);
                }
            })
        })

        activate(infoMessageHandler, m.current.getIncomingSignalCallback(), closeEventHandler)

        return () => {
            unsubscribeMeetingStore()
            unsubscribeMediaStore()
            useMeetingStore.getState().reset()
            m.current?.destroy()
        }
    }, []);


    function infoMessageHandler(message : InfoMessage) {
        useMeetingStore.getState().replaceUsersConnected(message.connected)
    }

    function closeEventHandler(ev : CloseEvent) {
        console.error("WS closed with code", ev.code)
        if (ev.code >= 4000) { // todo: better handling of errors codes, >= 4000 are ones for deliberate closing by backend
            setInMeeting(false)
        }

    }


    /*
    const transition : Transition = {layout:
            {
                type:"spring",
                stiffness: 400,
                damping:30
            }}

*/
    const transition = {} // leaving this so i can easily experiment with settings
    // todo probably split the different views (focus vs gallery) into individual components
    return <>
        <div className="">
            <WebSocketStatus></WebSocketStatus>
        </div>
        <div className={"h-[calc(100%-8rem)] pb-24 "}>
            <LayoutGroup>
                <motion.div className="flex flex-col h-full justify-center content-center mt-0 " layout transition={transition}>
                    { (focusedUser !== null) ?
                        <>
                            <div className="align-middle aspect-square w-full max-h-[66.6%] flex items-center justify-center mb-2 ">
                                <motion.div transition={transition} className="items-center max-w-full h-full max-h-full aspect-square" key={focusedUser} layout onClick={() => setFocusedUser(null)}>
                                    <UserFrame peerId={focusedUser} myId={myId}></UserFrame>
                                </motion.div>
                            </div>
                            <div className={"flex-1 min-h-1/3 "}>
                                <div className="flex flex-wrap gap-2 justify-center h-full">
                                    {participants.filter(u => u !== focusedUser).map(userId =>
                                        <motion.div transition={transition} className="aspect-square flex-shrink max-w-[calc(33%-0.25rem)] max-h-full text-xs " key={userId} layout onClick={() => setFocusedUser(userId)}>
                                            <UserFrame key={userId} peerId={userId} myId={myId}/>
                                        </motion.div>)}
                                </div>
                            </div>
                        </>
                        :
                        <div className="flex w-full flex-wrap gap-2 lg:gap-4 justify-center ">{participants.map(userId =>
                            <motion.div transition={transition} className="flex-grow aspect-square max-w-[calc(50%-0.25rem)] lg:max-w-[calc(33%-0.5rem)]" key={userId} layout onClick={() => setFocusedUser(prev => prev !== userId ? userId : null) }>
                                <UserFrame key={userId} myId={myId} peerId={userId}/>
                            </motion.div>
                        )}</div>
                    }
                </motion.div>
            </LayoutGroup>
            {participants.filter(userId => userId !== myId).map(userId => <DummyAudioElement userId={userId} key={userId}></DummyAudioElement> )}
            <div className="fixed bottom-0 left-0 right-0 h-24 content-center">
                <div className="flex flex-row justify-center gap-4">
                    <ControlPanel></ControlPanel>
                </div>
            </div>
        </div>
    </>
}