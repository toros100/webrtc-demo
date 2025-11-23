import { AudioLines } from "lucide-react";
import { Outlet } from "react-router-dom";

export default function Layout() {

    return (
        <>
            <header>
                <div className="flex flex-row items-center gap-2 lg:gap-4 h-8 lg:h-16 pl-4 lg:pl-6 pt-4">
                    <AudioLines className="p-fit hover:scale-y-80 duration-900 lg:scale-150 ease-in-out hover:stroke-indigo-300" size="40"></AudioLines>
                    <h1 className="text-2xl lg:text-4xl">WebRTC demo</h1>
                </div>
            </header>
            <main>
                <div className="h-[calc(100vh-2rem)]  lg:h-[calc(100vh-4rem)]">
                    <Outlet/>
                </div>
            </main>
        </>
    );

}