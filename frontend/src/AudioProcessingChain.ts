
export class AudioProcessingChain {

    userId : string;

    inTrack : MediaStreamTrack | null = null;
    wrapperStream : MediaStream | null = null;

    gain : number = 1;

    sourceNode : MediaStreamAudioSourceNode | null = null;
    gainNode : GainNode;
    analyserNode : AnalyserNode;


    analyserData : Uint8Array<ArrayBuffer>

    MAX_GAIN;


    audioContext : AudioContext;


    constructor(userId: string, audioContext: AudioContext, MAX_GAIN:number) {

        this.userId = userId;
        this.audioContext = audioContext;
        this.MAX_GAIN = MAX_GAIN;

        this.gainNode = audioContext.createGain();
        this.analyserNode = audioContext.createAnalyser();

        this.gainNode.gain.value = 1;
        this.analyserNode.fftSize = 32;
        this.analyserNode.smoothingTimeConstant = 0.5;
        this.analyserData = new Uint8Array(this.analyserNode.frequencyBinCount);


        this.gainNode.connect(this.analyserNode);
    }

    connect(node : AudioNode) : AudioNode {
        this.analyserNode.connect(node);
        return node
    }


    clearTrack() {
        this.sourceNode?.disconnect()
        this.inTrack = null;
        this.sourceNode = null;
        this.wrapperStream = null;
    }

    registerOrUpdateTrack(track: MediaStreamTrack) : void {
        if (track.kind !== "audio") {
            throw new Error("track must be audio track.");
        }

        this.clearTrack();

        this.wrapperStream = new MediaStream([track]);
        this.sourceNode = this.audioContext.createMediaStreamSource(this.wrapperStream);
        this.sourceNode.connect(this.gainNode)
    }

    disconnect() {
        this.analyserNode.disconnect();
    }

    setGain(val : number) {

        const valueClamped = Math.max(0, Math.min(val, this.MAX_GAIN));
        if (val !== valueClamped) {
            console.info("Tried to set gain value outside of [0, MAX_GAIN], used clamped value instead.")
        }

        // todo: if this causes clicks/pops, look into setting target value at time with curve
        this.gainNode.gain.value = valueClamped

    }


    calculateVolume() {
        if (this.sourceNode === null) {
            return 0;
        } else {
            this.analyserNode.getByteFrequencyData(this.analyserData)
            return Math.sqrt(this.analyserData.reduce((a, b) => a + b) / this.analyserData.length);
        }
    }

    cleanup() {
        this.sourceNode?.disconnect();
        this.gainNode.disconnect();
        this.wrapperStream = null;
        this.disconnect();
    }


}