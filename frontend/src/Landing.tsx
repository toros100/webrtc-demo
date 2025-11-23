import { useNavigate } from "react-router-dom";
import {useState} from "react";

export default function Landing() {

    const navigate = useNavigate();

    const [error, setError] = useState<string | null>(null);

    async function createMeeting() {
        const res = await fetch("/api/meeting/create", {method: "POST"});
        const body = await res.text()

        if (res.ok) {
            setError(null)
            navigate("meeting/" + body)
        } else {
                setError("Error: " + body)
        }
    }

    return (<>

            <div className="flex flex-col h-full justify-center items-center align-middle content-center">
                <div className="flex flex-col gap-4">
                    {error != null && <div className={"font-bold text-red-600"}>{error}</div>}
                    <button onClick={createMeeting} className="btn mx-auto">{error ? "Retry" : "Create meeting"}</button>
                </div>
            </div>
        </>
    )


}