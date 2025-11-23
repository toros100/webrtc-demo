import { useEffect, useState, type ReactNode } from "react";

import { IdentityContext } from "./useIdentity";

export const IdentityProvider = ({ children }: { children: ReactNode }) => {

    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string|null>(null)

    useEffect(() => {
        const getMyIdentity = async () => {
            const res = await fetch("/api/id/userId", {method: "GET"})
            if(res.ok) {
                const id = await res.text()
                setError(null)
                setUserId(id)
            } else {
                setError(res.status +": "+ res.statusText);
            }
        }

        getMyIdentity().catch((err) => {
            const error = err as Error;
            console.error("Error getting identity", error);
            setError(error.name)
        }).finally(() => setLoading(false))
    }, [])


    if (loading) {
        return <div className={"flex flex-col justify-center items-center h-[100vh]"}>loading...</div>
    }

    if (error || userId === null) {
        return (
            <div className="flex flex-col justify-center items-center h-[100vh] gap-8">
                <span>Something went wrong.</span>
                <span className="font-bold text-red-600">{error}</span>
                <button className="btn" onClick={() => window.location.reload()}>Retry</button>
            </div>
        )

    }

    return (<IdentityContext value={{userId}}>{children}</IdentityContext>)
}