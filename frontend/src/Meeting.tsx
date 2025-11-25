import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import MeetingInner from "./MeetingInner";
import WebSocketProvider from "./WebSocketProvider";

import GlowProvider from "./GlowProvider";
import { useIdentity} from "./useIdentity";
import { TurnCredentialsProvider } from "./TurnCredentialsProvider";
import {useMediaManagement} from "./useMediaManagement.ts";

export default function Meeting() {
    const {id: meetingId }= useParams();
    const {userId : myId} = useIdentity()
    const [inMeeting, setInMeeting] = useState(false);
    const {resumeIfSuspended} = useMediaManagement();

    const navigate = useNavigate();


    if (meetingId === undefined) {
        navigate("/");
    }

    useEffect(() => {
        const check = async () => {
            const r = await fetch("/api/meeting/"+meetingId+"/checkIfExists", {method: "GET"});
            if (!r.ok) {
                navigate("/")
            }
        }
        check().catch(() => navigate("/"));
    }, [meetingId]);


    async function joinMeeting() {
        resumeIfSuspended();

        const url = "/api/meeting/"+meetingId +"/join";
        const res = await fetch(url, {method: "POST"});
        const body = await res.text()

        if (res.ok) {
            console.log("joined meeting successfully")
            setInMeeting(true)
        } else {
            alert("Error: " + body)
            setInMeeting(false)

            if (res.status !== 409) {
                // 409 is "meeting full", which allows you to stay on the meeting page and try again
                // anything else is not recoverable
                navigate("/")
            }

        }
    }

    return (
        <div className="p-4 pb-0 h-full">
            <h2 className="font-bold text-l lg:text-xl  text-white">Meeting {meetingId}</h2>
            <b>Your ID: </b><span>{myId}</span>
            <br></br>
            <div className={"mb-2"}><span className={"font-bold text-indigo-400 cursor-pointer "} onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy URL</span> to invite others</div>
            {!inMeeting &&
                <div style={{minHeight: "50vh",display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
                    <button className="btn" onClick={() => {joinMeeting().catch((err) => {
                        console.error("Failed to join meeting", err)
                        navigate("/")
                    })}}>Join meeting</button>
                </div>
            }
            {inMeeting && meetingId !== undefined &&
                <WebSocketProvider myId={myId} meetingId={meetingId}>
                    <TurnCredentialsProvider>
                        <GlowProvider>
                            <MeetingInner myId={myId} setInMeeting={setInMeeting}></MeetingInner>
                        </GlowProvider>
                    </TurnCredentialsProvider>
                </WebSocketProvider>}
        </div>

    )
}