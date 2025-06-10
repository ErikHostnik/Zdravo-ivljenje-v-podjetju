# apk_installer/Dockerfile
FROM alpine:3.17

# install adb client
RUN apk update \
 && apk add --no-cache android-tools bash

WORKDIR /apk_output

ENTRYPOINT ["/bin/bash", "-c"]
