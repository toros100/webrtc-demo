import { useContext, createContext } from "react";

export const IdentityContext = createContext<{userId:string} | null>(null);

export const useIdentity = () => {
    const context = useContext(IdentityContext)
    if (!context) {
        throw new Error("useIdentity must be used within IdentityProvider.")
    }
    return context;
}
