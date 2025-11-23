import {useWebSocket} from "./useWebSocket.ts";


export default function WebSocketStatus() {

    const {isConnected, failed, retry} = useWebSocket()

    return (<>
        <span><b>Signaling: </b></span>
        {isConnected ? <span style={{color:"green"}}>connected</span> : <span style={{color: "red"}}>not connected</span>}
        <br></br>
        {failed && <button className="btn" onClick={retry}>Retry</button>}
    </>);



}