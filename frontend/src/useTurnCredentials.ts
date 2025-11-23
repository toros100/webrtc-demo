import type { TurnCredentials } from "./ZodSchemas"

import { useContext, createContext} from "react"

export const TurnCredentialsContext = createContext<{error: string | null, credentials: TurnCredentials | null} | null>(null)

export const useTurnCredentials = () => {

    const context = useContext(TurnCredentialsContext)

    if (!context) {
        throw new Error("useTurnCredentials must be used within TurnCredentialsProvider!")
    }

    return context

}