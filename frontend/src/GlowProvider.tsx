import {type ReactNode, type Ref, useEffect, useRef} from "react";
import {GlowContext} from "./useGlow.ts";
import {useMediaManagement} from "./useMediaManagement.ts";

export default function GlowProvider({children} : {children: ReactNode}) {

    const elementsRef = useRef(new Map());
    const {getVolume} = useMediaManagement()
    const requestId = useRef<number|null>(null);

    function registerGlow(userId: string, elementRef: Ref<HTMLDivElement>) {
        elementsRef.current.set(userId, elementRef)
    }

    function unregisterGlow(userId: string) {
        elementsRef.current.delete(userId)
    }

    function updateFrames() {
        elementsRef.current.forEach((element, userId) => {

            if (!element.current) {
                return;
            }
            const vol = getVolume(userId)

            const blurAmount = (vol < 4) ? 0 : 4;
            const spreadAmount = (vol < 4) ? 0 : 1;

            element.current.style.setProperty("--blurAmount", blurAmount)
            element.current.style.setProperty("--spreadAmount", spreadAmount)
        })

        setTimeout(() => {
            requestId.current = requestAnimationFrame(updateFrames)
        }, 20)
    }

    useEffect(() => {
        updateFrames()
        return () => {
            if (requestId.current !== null) {
                window.cancelAnimationFrame(requestId.current)
            }
        }
    }, []);

    return <GlowContext value={{registerGlow, unregisterGlow}}>{children}</GlowContext>
}