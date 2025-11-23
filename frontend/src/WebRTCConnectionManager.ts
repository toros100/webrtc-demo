import {WebRTCWrapper} from "./WebRTCWrapper.ts";
import type {ExtRTCSignalingMessage, OutgoingExtRTCSignalingMessage} from "./ZodSchemas.ts";
export class WebRTCConnectionManager {

    connections : Map<string, WebRTCWrapper>;
    sendSignal: (msg: OutgoingExtRTCSignalingMessage) => void;
    localUserId: string;

    selfConnectedToSignaling: boolean = false;
    peerConnectedToSignaling: Map<string, boolean>
    peerWaiting: Map<string, boolean>

    requestInfo: () => void;

    turnCredentials: {username: string, password: string} | null = null;

    onBitratesCalculated?: (userId: string, stats: {incoming:number, outgoing:number}) => void;
    onConnectionStateChange?: (userId: string, state: RTCPeerConnectionState) => void;
    onSignalingStateChange?: (userId: string, state: RTCSignalingState) => void;
    onTrack?: (userId: string, track: MediaStreamTrack, streams: MediaStream[]) => void;
    onDisconnect?: (userId: string) => void;

    inputTracks : MediaStreamTrack[] = []


    config : RTCConfiguration;

    constructor(localUserId: string, sendSignal: (msg: OutgoingExtRTCSignalingMessage) => void, requestInfo: () => void, turnCredentials: {username: string, password: string} | null) {
        this.connections = new Map();
        this.localUserId = localUserId;
        this.sendSignal = sendSignal;
        this.peerConnectedToSignaling = new Map()
        this.peerWaiting = new Map()
        this.requestInfo = requestInfo
        this.turnCredentials = turnCredentials;

        const envURLs : string | undefined = import.meta.env.VITE_COTURN_URLS
        if (envURLs === undefined) {
            console.error("VITE_COTURN_URLS undefined")
        }

        if (turnCredentials !== null && envURLs !== undefined) {
            console.info("Using coturn with credentials")
            const URLs : string[] = envURLs.split("'")
            this.config = {
                iceCandidatePoolSize: 10,
                iceServers: [
                    {
                        urls: URLs,
                        username: turnCredentials.username,
                        credential: turnCredentials.password
                    }
                ]
            }
        } else {
            console.info("coturn unavailable, using fallback")
            this.config = {
                iceServers: [
                    {
                        urls: [
                            'stun:stun.l.google.com:19302?transport=udp',
                            'stun:stun.l.google.com:19302?transport=tcp',
                        ]
                    }
                ]
            }
        }


    }

    _onSignalingStateChange(userId: string, state: RTCSignalingState): void {
        this.onSignalingStateChange?.(userId, state);
    }

    _onConnectionStateChange(userId: string, state: RTCPeerConnectionState): void {
        this.onConnectionStateChange?.(userId, state);
    }

    _onTrack(userId: string, track: MediaStreamTrack, streams: MediaStream[]): void {

        this.onTrack?.(userId, track, streams);
    }



    setInputTracks(tracks: MediaStreamTrack[]) : void {
        this.inputTracks = tracks;
        this.connections.forEach((peer) => {
            peer.setInputTracks(tracks);
        })
    }


    setPeerConnectedToSignaling(userId: string, connected: boolean): void {


        const peer = this.connections.get(userId);
        if (!peer) {
            return;
        }

        const prev = this.peerConnectedToSignaling.get(userId);


        if (prev && !connected) {
            this.peerConnectedToSignaling.set(userId, connected);
            // peer just disconnected from signaling
            // kill if data channel (internal signaling) not already working
            if (!peer.controlChannelOperational) {
                peer.wait()
                this.peerWaiting.set(userId, true)
            }
        }

        if (!prev && connected) {
            this.peerConnectedToSignaling.set(userId, connected);
            if (this.selfConnectedToSignaling) {
                peer.connect()
                this.peerWaiting.set(userId, false)
            }
        }


    }


    setConnectedToSignaling(connected: boolean) {

        const prev = this.selfConnectedToSignaling;
        this.selfConnectedToSignaling = connected

        if (prev && !connected) {
            // just lost signaling
            // bonk every peer that is not already self-sufficient (internal signaling via datachannel)
            this.connections.forEach((peer, userId) => {
                if (!peer.controlChannelOperational) {
                    peer.wait()
                    this.peerWaiting.set(userId, true)
                }
            })
        }

        if (!prev && connected) {
            // just gained signaling, trying to connect to reachable peers
            this.connections.forEach((peer, userId) => {
                if (this.peerConnectedToSignaling.get(userId)) {
                    peer.connect()
                    this.peerWaiting.set(userId, false)
                }
            })
        }
    }

    _sendSignal = (msg: OutgoingExtRTCSignalingMessage) => {

        if (this.selfConnectedToSignaling) {
            this.sendSignal(msg)
        } else {
            // defensive case, should not really be possible
            // if signaling was lost when data channel was not established, setSelfConnectedToSignaling should have
            // made the peer object wait already. if the data channel was already established, no message should
            // be going through this function at all
            const peer = this.connections.get(msg.to)
            if (peer === undefined) {
                console.error("Unexpected message: 'to' field does not contain registered peers userId")
            } else {
                peer.wait()
                this.peerWaiting.set(msg.from, true)
            }
        }
    }


    handleIncomingSignal(msg: ExtRTCSignalingMessage) : void {

        const peer = this.connections.get(msg.from)

        if (peer !== undefined) {
            peer.handleSignal(msg)
        } else {
            this.requestInfo() // normally peer should already be registered by the time we process a message
            // this requests the current user list from the signaling backend
            // if the mystery peer is in the meeting, then the peer will be registered
            // and automatically contacted after receiving the info
            // otherwise, this could happen with stale/inflight messages after a user got removed
            // in this case, we will harmlessly receive the current user list without that user in it
        }
    }


    getIncomingSignalCallback() {
        return (msg: ExtRTCSignalingMessage) => {this.handleIncomingSignal(msg)}

    }

    registerPeer(userId: string, peerConnectedToSignaling: boolean) {

        if (this.connections.has(userId)) {
            throw new Error("duplicate connection for userId");
        } else {
            const peer = new WebRTCWrapper(userId, this.localUserId, this._sendSignal, this.config);
            this.connections.set(userId, peer);


            this.peerConnectedToSignaling.set(userId, peerConnectedToSignaling)
            this.peerWaiting.set(userId, true)

            peer.onConnectionStateChange = (state: RTCPeerConnectionState) => this._onConnectionStateChange?.(userId, state);
            peer.onTrack = (track: MediaStreamTrack, streams: MediaStream[]) => this._onTrack?.(userId, track, streams);
            peer.onSignalingStateChange = (state: RTCSignalingState) => this._onSignalingStateChange?.(userId, state);

            peer.onDisconnect = () => this.onDisconnect?.(userId);

            peer.onBitratesCalculated = ({incoming, outgoing}) => this.onBitratesCalculated?.(userId, {
                incoming,
                outgoing
            });

            peer.setInputTracks(this.inputTracks)

            if (peerConnectedToSignaling && this.selfConnectedToSignaling) {
                peer.connect();
                this.peerWaiting.set(userId, false)
            } else {
                this.peerWaiting.set(userId, true)
            }
        }
    }


    unregisterPeer(userId: string) {
        const peer = this.connections.get(userId);
        if (!peer) {
            throw new Error("userId not registered")
        } else {
            peer.destroy();
            this.connections.delete(userId);
            this.peerWaiting.delete(userId);
            this.peerConnectedToSignaling.delete(userId);
        }
    }

    destroy() {

        for (const key of this.connections.keys()) {
            this.unregisterPeer(key);
        }

        this.onConnectionStateChange = undefined;
        this.onSignalingStateChange = undefined;
        this.onTrack = undefined;
        this.onDisconnect = undefined;
        this.onBitratesCalculated = undefined;


    }

}