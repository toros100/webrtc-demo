import "./App.css"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Meeting from './Meeting'
import {IdentityProvider} from './IdentityProvider'
import Layout from './Layout'
import Landing from './Landing'
import {MediaManagementProvider} from "./MediaManagementProvider.tsx";
import UserMediaProvider from "./UserMediaProvider.tsx";



const App = () => {

    return (
        <>
            <IdentityProvider>
                <BrowserRouter>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route path="/" element={<Landing />} />
                            <Route path="meeting">
                                <Route path=":id" element={
                                    <MediaManagementProvider>
                                        <UserMediaProvider>
                                            <Meeting/>
                                        </UserMediaProvider>
                                    </MediaManagementProvider>
                                }>
                                </Route>
                            </Route>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </IdentityProvider>
        </>
    )
}

export default App
