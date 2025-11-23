import { useEffect, useState, type ReactNode } from "react"
import { TurnCredentialsSchema, type TurnCredentials } from "./ZodSchemas"
import { TurnCredentialsContext } from "./useTurnCredentials"
import { ZodError } from "zod"

export const TurnCredentialsProvider = ({children} : {children: ReactNode}) => {

    const [credentials, setCredentials] = useState<TurnCredentials|null>(null)
    const [error, setError] = useState<string|null>(null)

    const [loading, setLoading] = useState(true)

    const requestCredentials = async () => {
        const res = await fetch("/api/turn-credentials", {method: "GET"})

        if (res.ok) {
            const t = await res.text()
            let obj;
            try {
                obj = JSON.parse(t)
            } catch (err) {
                console.error(err)
                setError("json parsing error")
                setCredentials(null)
                return
            }
            try {
                const creds = TurnCredentialsSchema.parse(obj)
                setCredentials(creds)
                setLoading(false)
                setError(null)
                return
            } catch (err) {
                setCredentials(null)
                setLoading(false)
                if (err instanceof ZodError) {
                    console.error(err)
                    setError("zod error")
                } else {
                    setError("unknown error")
                }
                
            }
        } else {
            setCredentials(null)
            setError("Error " + res.status + ": " + res.statusText)
            setLoading(false)
        }
    }


    useEffect(() => {
        setLoading(true)
        requestCredentials()
    },[])


    if (loading) {
        return <span>Requesting turn credentials...</span>
    } else {
        return <TurnCredentialsContext value={{credentials, error}}>{children}</TurnCredentialsContext>
    }


}