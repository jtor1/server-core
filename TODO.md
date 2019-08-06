- Logging
- Analytics
- Context Obj to pass between services
- Add container ID
- http client (for logging time of requests from both client and server)
- healthy endpoint {
  /status returns 200 ( plus metadata, git commit id, ip, hostname, docker image id )
  /healthy downstream services
}
