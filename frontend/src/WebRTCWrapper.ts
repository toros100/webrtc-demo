import {
    type ExtRTCSignalingMessage,
    ExtRTCSignalingMessageSchema,
    type RTCSignalingMessage,
    type TokenNegotiationMessage
} from "./ZodSchemas.ts";
import type {OutgoingExtRTCSignalingMessage} from "./ZodSchemas.ts";
import { nanoid } from "nanoid";

// @ts-expect-error already active after import
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import adapter from "webrtc-adapter";

type PartialOutgoingMessage = {
    type: "offer" | "answer" | "ice-candidate",
    content: string
} | {
    type: "requesting" | "acknowledging" | "synchronized"
}


type TokenNegotiationState = "new" | "requesting" | "acknowledging" | "synchronized";


class QueueClearedError extends Error {}

class NegotiationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NegotiationError";
    }
}

export class WebRTCWrapper {
    sendSignal: (msg: OutgoingExtRTCSignalingMessage) => void;
    peerId: string;
    myId: string;
    config: RTCConfiguration;
    processingSignals: boolean = false;

    connectionState: RTCPeerConnectionState | null = null;
    signalingState: RTCSignalingState | null = null;

    isConnecting : boolean = false;
    polite: boolean;

    token: string;

    queuedNegotiation = false;
    peerObjectPristine: boolean = false;

    usingRelayCandidate = false;
    sendHeartbeatInterval : number | null = null;
    checkHeartbeatInterval : number | null = null;

    inputTracks: MediaStreamTrack[] = [];

    peer!: RTCPeerConnection;

    controlChannel: RTCDataChannel | null = null;

    controlChannelOperational: boolean = false;


    wrapperStream : MediaStream = new MediaStream();


    locked: boolean = false;
    operationsQueue: ({resolve: () => void, reject: (e: QueueClearedError) => void })[] = []


    ongoingNegotiation: boolean = false;


    onBitratesCalculated: ((stats: {incoming:number, outgoing:number}) => void) | null = null;
    bitratesIntervalId: number | null = null;
    bytesReceivedHistory : {bytes: number, timestamp: number}[] = []
    bytesSentHistory : {bytes:number, timestamp:number}[] = []

    outgoingMessageCounter = 0;
    incomingMessageCounter = 0;

    onTrack? : (track: MediaStreamTrack, streams: MediaStream[]) => void;
    onConnectionStateChange? : (state: RTCPeerConnectionState) => void;
    onSignalingStateChange? : (state: RTCSignalingState) => void;
    onDisconnect?: () => void;

    peerSessionVersion: number | null = null;

    tokenNegotiationState: TokenNegotiationState;

    constructor(peerId: string, myId: string, sendSignal: (msg: OutgoingExtRTCSignalingMessage) => void, config: RTCConfiguration, ) {

        this.tokenNegotiationState = "new";

        if (peerId === myId) {
            throw new Error("Must have peerId !== myId")
        }

        this.sendSignal = sendSignal

        this.peerId = peerId;
        this.myId = myId;
        this.token = nanoid(10)
        this.polite = myId < peerId;
        this.config = config;

        this.bitratesIntervalId = setInterval(async () => {
            if (this.onBitratesCalculated !== null) {
                const incoming = await this._calculateIncomingBitrate();
                const outgoing = await this._calculateOutgoingBitrate();
                this.onBitratesCalculated?.({incoming: incoming, outgoing: outgoing})
            }
        },500)


        this._createFreshPeerObject()
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _createFreshPeerObject(_reason?:string) {

        if (this.peerObjectPristine) {
            return;
        }

        this.controlChannelOperational = false;
        this.token = nanoid(10)
        this.tokenNegotiationState = "new"
        this.incomingMessageCounter = 0;
        this.outgoingMessageCounter = 0;
        if (this.sendHeartbeatInterval) {
            clearInterval(this.sendHeartbeatInterval);
            this.sendHeartbeatInterval = null;
        }

        if (this.checkHeartbeatInterval) {
            clearInterval(this.checkHeartbeatInterval);
            this.checkHeartbeatInterval = null;
        }

        if (this.peer) {
            this.onDisconnect?.()
            this.peer.close()
        }

        if (this.controlChannel) {
            this._cleanupDataChannel(this.controlChannel)
        }

        this.controlChannel = null

        this.bytesReceivedHistory = []
        this.bytesSentHistory = []

        // cleanup
        this.ongoingNegotiation = false;
        this.controlChannel = null;
        this.connectionState = null;
        this.signalingState = null;
        this.processingSignals = false;
        this.isConnecting = false;
        const peer = new RTCPeerConnection(this.config)
        this.peer = peer

        this._addEventHandlers(peer);
        this.peerObjectPristine = true;

    }

    async lock() {
        if (!this.locked) {
            this.locked = true;
            return;
        }
        await new Promise<void>(((resolve, reject) => this.operationsQueue.push({resolve, reject})))
    }

    unlock() {
        const next = this.operationsQueue.shift()
        if (next) {
            next.resolve()
        } else {
            this.locked = false;
        }
    }

    clearQueue() {
        const err = new QueueClearedError();
        let next = this.operationsQueue.pop()
        while (next) {
            next.reject(err)
            next = this.operationsQueue.pop()
        }
        this.unlock()
    }


    _onConnectionStateChange(state : RTCPeerConnectionState) {
        this.connectionState = state;
        this.onConnectionStateChange?.(state);
    }

    _onSignalingStateChange(state: RTCSignalingState) {
        this.signalingState = state;
        this.onSignalingStateChange?.(state);
    }

    destroy(): void {

        this.clearQueue()

        this.peer.ontrack = null;
        this.peer.onconnectionstatechange = null;
        this.peer.onsignalingstatechange = null;
        this.peer.ondatachannel = null;
        this.peer.onnegotiationneeded = null;

        if (this.bitratesIntervalId !== null) {
            clearInterval(this.bitratesIntervalId);
        }

        if (this.sendHeartbeatInterval !== null) {
            clearInterval(this.sendHeartbeatInterval);
        }

        if (this.checkHeartbeatInterval !== null) {
            clearInterval(this.checkHeartbeatInterval);
        }


        this.peer.close() // event handlers attached to peer should be cleaned up internally

        // @ts-expect-error ref cleanup
        this.sendSignal = null

    }

    _calculateOutgoingBitrate = async () => {

        const peer = this.peer;
        const report = await peer.getStats()

        let totalBytesSent : number = 0;
        let timeStamp : number | null = null;
        report.forEach((entry : RTCStats) => {
            if (entry.type === "outbound-rtp") {
                const stats = entry as RTCOutboundRtpStreamStats;
                totalBytesSent += stats.bytesSent!; // this always exists according to mdn
                timeStamp = timeStamp ?? stats.timestamp; // assuming all reports included have the same timestamp
            }
        })

        if (timeStamp === null) {
            // no outbound-rtp report present
            return 0
        }
        this.bytesSentHistory.push({bytes: totalBytesSent, timestamp: timeStamp})
        this.bytesSentHistory = this.bytesSentHistory.filter(({timestamp: t}) => timeStamp! - t < 5000)

        if (this.bytesSentHistory.length >= 2) {

            const sorted = this.bytesSentHistory.sort((a, b) => a.timestamp - b.timestamp)
            const latest = sorted[sorted.length - 1]
            const oldest = sorted[0]
            const kbps = ((latest.bytes - oldest.bytes)*8) / (latest.timestamp - oldest.timestamp)
            return Math.trunc(kbps)
        } else {
            return 0
        }
    }

    _calculateIncomingBitrate = async () => {

        const peer = this.peer;
        const report = await peer.getStats()


        let totalBytesReceived : number = 0;
        let timeStamp : number | null = null;
        report.forEach((entry : RTCStats) => {
            if (entry.type === "inbound-rtp") {
                const stats = entry as RTCInboundRtpStreamStats;

                totalBytesReceived += stats.bytesReceived!; // this always exists according to mdn
                timeStamp = timeStamp ?? stats.timestamp; // assuming all reports included have the same timestamp
            }
        })

        if (timeStamp === null) {
            // no inbound-rtp stats
            return 0;
        }
        this.bytesReceivedHistory.push({bytes: totalBytesReceived, timestamp: timeStamp})
        this.bytesReceivedHistory = this.bytesReceivedHistory.filter(({timestamp: t}) => timeStamp! - t < 5000)

        if (this.bytesReceivedHistory.length >= 2) {

            const sorted = this.bytesReceivedHistory.sort((a, b) => a.timestamp - b.timestamp)
            const latest = sorted[sorted.length - 1]
            const oldest = sorted[0]
            const kbps = ((latest.bytes - oldest.bytes)*8) / (latest.timestamp - oldest.timestamp)
            return Math.trunc(kbps)
        } else {
            return 0
        }
    }


    _handleDataChannelSignal(peer: RTCPeerConnection, str : string) {
        if (peer !== this.peer) {
            return
        }
        if (!this.controlChannelOperational) {
            this.controlChannelOperational = true;
            this._setInputTracks(this.inputTracks)
        }
        let msg;
        try {
            msg = JSON.parse(str)
        } catch (e) {
            const error = e as Error
            console.error(error.name, "while handling data channel signal")
            return;
        }
        const parsed = ExtRTCSignalingMessageSchema.safeParse(msg)
        if (parsed.success) {
            this.handleSignal(parsed.data)
        } else {
            console.error("Failed to parse ExtRTCSignalingMessage from data channel message")
        }
    }

    setInputTracks(tracks : MediaStreamTrack[]) {

        if (this.controlChannelOperational) {
            console.log("[WebRTCWrapper] processing input tracks")
            this._setInputTracks(tracks)
        } else {
            console.log("[WebRTCWrapper] caching input tracks, will process when control channel connected")
            this.inputTracks = tracks
        }
    }

    async _setInputTracks(tracks : MediaStreamTrack[]) {
        this.inputTracks = tracks;
        this.bytesSentHistory = []
        this.bytesReceivedHistory = []

        if (this.isConnecting) {
            const peer = this.peer;
            const currentTracks = this.peer.getSenders().map(s => s.track).filter(t => t !== null);

            const newTracks = tracks.filter(t => !currentTracks.includes(t));
            const staleTracks = currentTracks.filter(t => !newTracks.includes(t));

            const staleSenders = peer.getSenders().filter(s => s.track && staleTracks.includes(s.track));

            const usedSenders: RTCRtpSender[] = []

            for (const track of newTracks) {
                const candidateSender = staleSenders.find(s => s.track && s.track.kind === track.kind && !usedSenders.includes(s));
                if (candidateSender) {
                    usedSenders.push(candidateSender);
                    try {
                        await candidateSender.replaceTrack(track)
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    } catch (_) {
                        peer.addTrack(track, this.wrapperStream)
                    }
                } else {
                    peer.addTrack(track, this.wrapperStream)
                }
            }
            peer.getSenders().forEach(s => {
                if (s.track && !tracks.includes(s.track)) {
                    peer.removeTrack(s);
                }
            })
        }
    }


    connect() {

        if (this.isConnecting) {
            console.info("already connecting")
            return
        }
        this.isConnecting = true;

        console.log("[WebRTCWrapper] connect()");

        this.negotiateToken();
        return;
    }


    negotiateToken() {
        this.tokenNegotiationState = "requesting";
        this.sendHeartbeat(this.peer)
    }

    sendHeartbeat(peer: RTCPeerConnection) {

        // want to have some kind of heartbeat/timeout mechanism in any case, so might as well
        // use token negotiation messages as heartbeat. this has the added benefit of making them
        // impossible to "miss", which could leave the negotiation stuck and would require its own
        // timeout/retry mechanism.

        if (this.tokenNegotiationState !== "new") {
            this._sendSignal(peer, {
                type: this.tokenNegotiationState
            })
        }
    }


    setupControlChannel() {


        const peer = this.peer;
        const controlChannel = peer.createDataChannel("control", {id:0, negotiated: true})

        const timeoutId = setTimeout(() => {

            if (controlChannel.readyState !== "open") {
                console.error("failed to connect control channel after 15s, retrying")
                this.handleControlChannelFailure(peer, controlChannel)

            }

        },15000)

        controlChannel.onopen = () => {
            clearTimeout(timeoutId)
            if (controlChannel !== this.controlChannel) {
                controlChannel.onopen = null
                controlChannel.close() // normally this should not happen, defensive cleanup i guess
            }

            this.sendHeartbeatInterval = setInterval(() => {
                this.sendHeartbeat(peer)

                // i dont think there is any reliable trigger to use for updating the connection type,
                // so i am just polling it
                this.updateConnectionType(peer).catch((err) => {
                    console.error("Error updating connection type:", err)
                })


            }, 1000)

        }

        controlChannel.onmessage =  (event ) => {

            if (controlChannel !== this.controlChannel) {
                controlChannel.onmessage = null;
                controlChannel.close()
                return
            } else if (event instanceof  MessageEvent && typeof event.data === "string") {
                this._handleDataChannelSignal(peer, event.data)
            } else {
                console.error("unknown datachannel message event")
            }

        }
        controlChannel.onerror = () => this.handleControlChannelFailure(peer, controlChannel);
        controlChannel.onclosing = () => this.handleControlChannelFailure(peer, controlChannel);
        controlChannel.onclose = () => this.handleControlChannelFailure(peer, controlChannel);

        this.controlChannel = controlChannel

        return controlChannel
    }


    _cleanupDataChannel(dataChannel : RTCDataChannel) {
        dataChannel.onerror = null;
        dataChannel.onmessage = null;
        dataChannel.onclose = null;
        dataChannel.onclosing = null;
        dataChannel.onopen = null;
        dataChannel.close()
    }


    handleControlChannelFailure(peer: RTCPeerConnection, dataChannel: RTCDataChannel) {
        this._cleanupDataChannel(dataChannel)
        if (this.controlChannel === dataChannel) {
            this.controlChannel = null;
        }
        if (peer === this.peer) {
            //console.error("[WebRTCWrapper] datachannel failure")
            this._createFreshPeerObject("datachannel failure");
        }
    }


    wait() {
        this._createFreshPeerObject("waiting")
    }


    async eventuallyNegotiate(peer: RTCPeerConnection) {
        if (this.queuedNegotiation || peer !== this.peer) {
            return;
        }
        this.queuedNegotiation = true;
        this.peerObjectPristine = false;

        try {
            await this.lock()
        } catch (err) {
            if (err instanceof QueueClearedError) {
                return
            } else {
                throw err;
            }
        }
        try {
            if (peer !== this.peer) {
                return
            } else if (peer.signalingState !== "stable") {
                this.queuedNegotiation = false;
                // no need to requeue: according to spec, event should fire again when in stable state again,
                // if there are any changes that still require negotiation
                return;
            } else {
                this.queuedNegotiation = false;
                await peer.setLocalDescription()
                this._sendSignal(peer, {
                    type: "offer",
                    content: JSON.stringify(peer.localDescription),
                })
            }
        } finally {
            if (peer === this.peer) {
                this.unlock()
            }
        }
    }

    async updateConnectionType(peer: RTCPeerConnection) {
        // this is the only way i could figure out to check if the connection is using the turn server
        // or if its "true" peer-to-peer. not sure if this is always accurate.

        if (peer !== this.peer) {
            return
        }
        const foundTypes : string[] = []

        const stats = await peer.getStats()

        if (peer !== this.peer) {
            return
        }

        // this is slightly ugly and might end up with undefined in foundTypes, but we only really care if there
        // is at least one relay candidate in there
        stats.forEach(stat => {
            if (stat.type == "candidate-pair" && stat.selected) { // firefox-only property (selected)
                foundTypes.push(stats.get(stat.localCandidateId)?.candidateType)
                foundTypes.push(stats.get(stat.remoteCandidateId)?.candidateType)
            } else {
                if (stat.type == "transport") {
                    if (stat.selectedCandidatePairId) { // all other relevant browsers have this according to mdn
                        const candidatePairStat = stats.get(stat.selectedCandidatePairId)
                        if (candidatePairStat) {
                            foundTypes.push(stats.get(candidatePairStat.localCandidateId)?.candidateType)
                            foundTypes.push(stats.get(candidatePairStat.remoteCandidateId)?.candidateType)
                        }
                    }
                }
            }
        })

        this.usingRelayCandidate = foundTypes.includes("relay")
    }

    _addEventHandlers(peer: RTCPeerConnection) {

        peer.onconnectionstatechange = () => {
            if (peer !== this.peer) {
                peer.onconnectionstatechange = null;
                return;
            } else {
                this.connectionState = peer.connectionState
                this._onConnectionStateChange(peer.connectionState);
            }
        }

        peer.onsignalingstatechange = () => {
            if (peer !== this.peer) {
                peer.onsignalingstatechange = null;
                return;
            } else {
                this.signalingState = peer.signalingState;
                this._onSignalingStateChange(peer.signalingState);
            }
        }

        peer.oniceconnectionstatechange = () => {
            if (peer !== this.peer) {
                peer.oniceconnectionstatechange = null;
                return;
            } else {
                if (peer.iceConnectionState === "failed") {
                    this._createFreshPeerObject("ice failure")
                }
            }
        }

        peer.onnegotiationneeded = () => {
            if (peer !== this.peer) {
                peer.onnegotiationneeded = null;
                return;
            } else {
                this.peerObjectPristine = false;
                console.log("negotiationneeded");
                this.eventuallyNegotiate(peer).catch(err => {
                    this._createFreshPeerObject("error during eventuallyNegotiate: " + err.name);
                })
            }
        }

        peer.onicecandidate = ({candidate}) => {
            if (peer !== this.peer) {
                peer.onicecandidate = null;
                return;
            } else {
                const str = JSON.stringify(candidate)
                this._sendSignal(peer, {type: "ice-candidate", content: str})
            }
        }

        peer.ontrack = (ev) => {
            console.log("ontrack event")
            if (peer !== this.peer) {
                peer.ontrack = null;
                return;
            } else {
                this.onTrack?.(ev.track, Array.from(ev.streams))
            }
        }
    }


    handleSignal(msg: ExtRTCSignalingMessage) {

        if (msg.from !== this.peerId) {
            throw new Error("Field 'from' must be peerId as passed into constructor.");
        }
        if (msg.to !== this.myId) {
            throw new Error("Field 'to' must be myId as passed into constructor.");
        }

        if (this.peerSessionVersion === null) {
            this.peerSessionVersion = msg.version
        } else {
            if (this.peerSessionVersion < msg.version) {
                // "version" is the timestamp of the remote peers signaling websocket sessions creation
                // if the remote peer has a new wss mid-negotiation, we can no longer guarantee the order of messages
                this.peerSessionVersion = msg.version

                if (!this.controlChannelOperational) {
                    this._createFreshPeerObject("Remote peer has new websocket session.")
                }
            }
        }


        if (msg.type === "acknowledging" || msg.type === "requesting" || msg.type === "synchronized") {
            this.handleTokenNegotiation(msg)
        } else if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice-candidate") {
            if (msg.token !== this.token) {
                console.error("Ignoring message with wrong token", msg.token, "(expected: " + this.token + ")")
                return;
            } else if (msg.token === this.token && this.tokenNegotiationState === "acknowledging") {
                this.tokenNegotiationState = "synchronized"
                this.setupControlChannel()
            }

            if (msg.counter !== this.incomingMessageCounter) {
                //this._init("wrong counter. expected " + this.incomingMessageCounter + " and got " + msg.counter)
                //this.negotiateToken()
                console.error("wrong counter. expected " + this.incomingMessageCounter + " and got " + msg.counter)
            }

            const peer = this.peer;
            this.incomingMessageCounter++;
            this._processSignal(msg, peer).catch((err) => {
                if (err instanceof NegotiationError) {
                    console.error("Fatal error: " + err.message + ". Restarting negotiation.")
                    this._createFreshPeerObject(err.name + ": " + err.message)
                } else {
                    console.error("Error while processing signal: " + err.message)
                }
            })

        } else {
            // @ts-expect-error impossible by type, but types don't exist at runtime and i want weird unexpected bugs to be noticeable
            console.error("Unexpected message type:", msg.type)
        }
        return;
    }


    handleTokenNegotiation(msg: TokenNegotiationMessage) {

        // handshake to synchronize local and remote peer objects (i.e. make sure both are fresh), which
        // allows either end of the connection to replace their peer object to recover from inconsistent state.
        // the token is random for practical reasons, it is not meant to imply or be used for any kind of security.

        this.isConnecting = true;
        if (this.tokenNegotiationState === "synchronized" && msg.token === this.token) {
            return;
        }
        if (msg.type === "requesting") {
            if (this.polite || this.tokenNegotiationState !== "requesting") {
                this._createFreshPeerObject("accepted request " + msg.token + " acknowledging")
                this.token = msg.token;
                this.tokenNegotiationState = "acknowledging"
                this.sendHeartbeat(this.peer)
                //console.log("Token negotiation acknowledging token", this.token)

            }
        } else if (msg.type === "acknowledging") {
            if (this.tokenNegotiationState === "requesting" && msg.token === this.token) {
                this.tokenNegotiationState = "synchronized"
                this.sendHeartbeat(this.peer)
                //console.log("Token negotiation synchronized with token", this.token)
                this.setupControlChannel()
            }
        } else if (msg.type === "synchronized" && msg.token === this.token && this.tokenNegotiationState === "acknowledging") {
            this.tokenNegotiationState = "synchronized"
            this.sendHeartbeat(this.peer)
            this.setupControlChannel()
            //console.log("Token negotiation stable with token", this.token)
        }
    }

    async _processSignal(msg: RTCSignalingMessage, peer: RTCPeerConnection) {
        try {
            await this.lock()
        } catch (err) {
            if (err instanceof QueueClearedError) {
                return;
            } else {
                throw err
            }
        }

        this.peerObjectPristine = false;

        if (msg.type !== "ice-candidate") {
            console.log("processing", msg.type)
        }

        try {
            const msgContent = JSON.parse(msg.content)

            if (msg.type === "offer") {
                if (peer.signalingState === "stable" || (this.polite && peer.signalingState === "have-local-offer")) {
                    // for the have-local-offer case, setRemoteDescription does implicit rollback
                    await peer.setRemoteDescription(msgContent)
                    if (this.peer !== peer) { // gotta love async/await
                        return
                    }
                    await peer.setLocalDescription()
                    this._sendSignal(peer, {
                        type: "answer",
                        content: JSON.stringify(peer.localDescription),
                    })
                } else if (!this.polite && peer.signalingState === "have-local-offer") {
                    return;
                } else {
                    throw new NegotiationError("Received offer in incompatible signaling state " + peer.signalingState)
                }
            } else if (msg.type === "answer") {
                if (peer.signalingState === "have-local-offer") {
                    await peer.setRemoteDescription(msgContent)
                } else {
                    throw new NegotiationError("Received answer in incompatible signaling state " + peer.signalingState)
                }
            } else if (msg.type === "ice-candidate") {
                if (peer.remoteDescription !== null) {
                    try {
                        await peer.addIceCandidate(msgContent)
                    } catch (e) {
                        console.warn("Error adding ICE candidate:", e)
                    }
                } else if (!this.polite && peer.signalingState === "have-local-offer") {
                    console.log("[WebRTCWrapper] ignored ice-candidate from" + this.peerId)
                } else {
                    throw new NegotiationError("Received ice-candidate in incompatible signaling state " + peer.signalingState)
                }
            }
        } finally {
            if (peer === this.peer) {
                this.unlock();
            }
        }
    }


    _sendSignal(peer: RTCPeerConnection, msg : PartialOutgoingMessage) {

        if (peer !== this.peer) {
            console.info("Suppressed stale outgoing message.")
            return;
        }

        const baseMessage = {
            type: msg.type,
            to: this.peerId,
            from: this.myId,
            token: this.token
        }
        let preparedMessage : OutgoingExtRTCSignalingMessage;

        if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice-candidate") {
            preparedMessage = {
                ...baseMessage,
                counter: this.outgoingMessageCounter++,
                content: msg.content
            }
        } else if (msg.type === "requesting" || msg.type === "acknowledging" || msg.type === "synchronized") {
            preparedMessage = baseMessage as OutgoingExtRTCSignalingMessage
        } else {
            console.error("Unexpected message type:", msg.type)
            return;
        }


        if (this.controlChannel !== null && this.controlChannel.readyState === "open") {
            try {
                this.controlChannel.send(JSON.stringify({
                    version: this.peerSessionVersion, // have to add version manually here, normally added by signaling backend
                    ...preparedMessage
                }))
            } catch (e) {
                const err = e as Error
                console.error("Data channel failed to send message: " + err.name + ": " + err.message)
                this.handleControlChannelFailure(peer, this.controlChannel)
            }
            return;
        } else try {
            this.sendSignal(preparedMessage);
        } catch (err) {
            console.error("error sending signal", err);
        }
    }
}