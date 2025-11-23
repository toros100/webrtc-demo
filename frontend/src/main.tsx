import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App';
import './App.css'

const strict = false;

if (strict) {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
                <App></App>
        </StrictMode>,)
} else {
    createRoot(document.getElementById('root')!).render(
            <App></App>
    )
}
