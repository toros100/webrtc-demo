import { useEffect, useState } from "react";
import {useWebSocket} from "./useWebSocket.ts";
import WebSocketStatus from "./WebSocketStatus";
import type {InfoMessage} from "./ZodSchemas";
import DummyAudioElement from "./DummyAudioElement.tsx";
import { useMeetingStore } from "./useMeetingStore";
import UserFrame from "./UserFrame.tsx";
import {type ConnectionState, WebRTCConnectionManager} from "./WebRTCConnectionManager.ts";
import {useShallow} from "zustand/react/shallow";
import {useMediaStore} from "./MediaStore.ts";
import {useMediaManagement} from "./useMediaManagement.ts";
import {LayoutGroup, motion} from "motion/react";
import {RTCStatsStore} from "./RTCStatsStore.ts";
import {useTurnCredentials} from "./useTurnCredentials.ts";
import ControlPanel from "./ControlPanel.tsx";
import {useNavigate} from "react-router-dom";

export default function MeetingInner({myId} : {myId:string, setInMeeting : (b: boolean) => void}) {

    const navigate = useNavigate()
    const participants = useMeetingStore(useShallow(state => Object.keys(state.usersReachable)))
    const {activate, prepareAndSend, isConnected, requestInfo} = useWebSocket();
    const {credentials} = useTurnCredentials();
    const [focusedUser, setFocusedUser] = useState<string | null>(null);
    const {registerOrUpdateMediaTracks, clearUserMedia, clearAllMedia} = useMediaManagement()

    const [manager] = useState(() => new WebRTCConnectionManager(myId, prepareAndSend, requestInfo, credentials))
    manager.setSelfConnectedToSignaling(isConnected)

    useEffect(() => {

            // @ts-expect-error so i can access the manager in the console for poking around
            window.rtcmanager = manager.current;

            manager.onTrack = (userId, _track, streams) => {

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


        manager.onBitratesCalculated = (userId: string, {incoming, outgoing}) => {
            RTCStatsStore.getState().setUserBitrates(userId, {incoming, outgoing})
        }

        manager.onDisconnect = (userId: string) => {
            useMediaStore.getState().setStoredMediaTracks(userId, [])
        }

        manager.onConnectionStateChange = (userId: string, state: ConnectionState) => {
            queueMicrotask(() => useMeetingStore.getState().updateUserConnectionState(userId, state))
        }

        const initialParticipants = Object.keys(useMeetingStore.getState().usersReachable)
        initialParticipants.forEach((userId) => {
            if (userId !== myId) {
                const peerConnectedToSignaling = useMeetingStore.getState().usersReachable[userId]
                manager.registerPeer(userId, peerConnectedToSignaling)
            }

        })

        const usersDiff = (previousUsers: string[], currentUsers: string[]) => {
            return {
                joined: currentUsers.filter(userId => !previousUsers.includes(userId)),
                left: previousUsers.filter(userId => !currentUsers.includes(userId)),
            }
        }

        const initialTracks = useMediaStore.getState().mediaTracks[myId] ?? []
        manager.setInputTracks(initialTracks);

        const unsubscribeMediaStore = useMediaStore.subscribe((state) => {
            manager.setInputTracks(state.mediaTracks[myId] ?? []);
        })

        const unsubscribeMeetingStore = useMeetingStore.subscribe((state, prevState) => {

            const {joined, left} = usersDiff(Object.keys(prevState.usersReachable), Object.keys(state.usersReachable));

            joined.forEach(userId => {
                if (userId !== myId) {
                    const peerConnected = state.usersReachable[userId];
                    manager.registerPeer(userId, peerConnected)
                }
            });
            if (left.length > 0) {
                left.forEach(userId => {
                    manager.unregisterPeer(userId)
                    RTCStatsStore.getState().clearUser(userId)
                });
                useMeetingStore.getState().removeUsers(left)
                clearUserMedia(left)


            }

            Object.keys(state.usersReachable).forEach((userId) => {
                if (userId !== myId) {
                    const peerConnected = state.usersReachable[userId];
                    manager.setPeerConnectedToSignaling(userId, peerConnected);
                }
            })
        })

        activate(infoMessageHandler, manager.getIncomingSignalCallback(), closeEventHandler)

        return () => {
            unsubscribeMeetingStore()
            unsubscribeMediaStore()
            useMeetingStore.getState().clear()
            clearAllMedia()
            RTCStatsStore.getState().clear()
            manager.destroy()
        }
    }, []);


    function infoMessageHandler(message : InfoMessage) {
        useMeetingStore.getState().replaceUsersReachable(message.connected)
    }

    function closeEventHandler(ev : CloseEvent) {
        if (ev.code >= 4000) {
            navigate("/")
            alert(ev.reason)
        } else {
            console.error("WS closed with code", ev.code)
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