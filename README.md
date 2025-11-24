# Readme

This is a personal project I made to learn more about Spring Boot and React. It's still a bit rough around the edges, but
a demo is available at [trosenkranz.dev](https://trosenkranz.dev) (Basic auth to prevent abuse, the username is "guest" and the password is
my date of birth in DDMMYYYY, which you know if you got here via my CV or are a friend. If you fit neither of these categories but would still
like to check it out, you can [email](mailto:trosenkranz@protonmail.com) me.)


## Some Details
* WebRTC-based audio/video meetings (no libraries for WebRTC, just raw RTCPeerConnection objects)
* Signaling implemented via WebSockets in Spring Boot (no messaging libraries, just WebSockets on both ends)
* My own version of "perfect negotiation", with a special handshake to synchronize peer objects (for coordinated resets/recovery)
* Basic React+Tailwind for the UI
* Web Audio API for basic audio processing (just to make the users frame glow when sound is detected)
* Noteworthy dependencies: zustand, zod
* The demo is hosted on Hetzner cloud servers (one for nginx and the Spring Boot backend in networked Docker containers and another one for an instance of coturn)
