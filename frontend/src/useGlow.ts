import {createContext, type Ref, useContext} from "react";

type GlowContextType = {
    registerGlow: (userId: string, elementRef: Ref<HTMLDivElement>) => void,
    unregisterGlow: (userId: string) => void;
}

export const GlowContext = createContext<GlowContextType|null>(null)


export const useGlow = () => {
    const context = useContext(GlowContext)
    if (context === null) {
        throw new Error('Must be used within GlowContext')
    }
    return context
}