# Readme

This is a personal project I made to learn more about Spring Boot and React. It's still a bit rough around the edges.


## Some Details
* WebRTC-based audio/video meetings (no libraries for WebRTC, just raw RTCPeerConnection objects)
* Signaling implemented via WebSockets in Spring Boot (no messaging libraries, just WebSockets on both ends)
* My own version of "perfect negotiation", with a special handshake to synchronize peer objects (for coordinated resets/recovery)
* Basic React+Tailwind for the UI
* Web Audio API for basic audio processing (just to make the users frame glow when sound is detected)
* Noteworthy dependencies: zustand, zod

