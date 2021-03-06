FROM ubuntu:16.04 as builder

# Setup APT
RUN echo 'APT::Install-Recommends "0";' > /etc/apt/apt.conf.d/dx-no-recommends
RUN apt-get update && apt-get -y upgrade

# Remove init system
RUN apt-get purge -y --allow-remove-essential init systemd

# Curl
RUN apt-get install -y ca-certificates curl

# Build-time utils
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https gdebi-core localepurge

# Node
RUN curl -L https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs
RUN npm i -g npm@4
RUN npm cache clean
RUN npm set progress=false
RUN npm set loglevel=error
RUN npm set depth=0
RUN npm set unsafe-perm=true
RUN npm set fetch-retries 5

# .NET Core
RUN curl -L https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.gpg
RUN echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-xenial-prod xenial main" > /etc/apt/sources.list.d/dotnetdev.list
RUN apt-get update
RUN DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 apt-get install -y dotnet-sdk-2.0.2
RUN rm /usr/share/dotnet/sdk/*/nuGetPackagesArchive.lzma

# Chrome, see https://stackoverflow.com/a/36906724
RUN curl -L https://www.slimjet.com/chrome/lnx/chrome64_62.0.3202.75.deb > chrome.deb
RUN gdebi -n ./chrome.deb
RUN unlink ./chrome.deb
RUN rm -rf /opt/google/chrome/swiftshader
RUN find /opt/google/chrome/locales -type f ! -name 'en-US.pak' -delete

# Utils for docker-ci.sh
RUN apt-get install -y dbus-x11 httping x11vnc xvfb

# Utils for drone-cache.sh
RUN apt-get install liblz4-tool

# Yes :)
RUN apt-get install -y mc

# Use UTF-8
RUN apt-get install -y locales
RUN locale-gen en_US.UTF-8
RUN printf "MANDELETE\nen_US.UTF-8" > /etc/locale.nopurge
RUN localepurge

# Ensure UTC
RUN [ "$(date +%Z)" = "UTC" ] || exit 1

# Remove build-time utils
RUN apt-get purge -y apt-transport-https gdebi-core localepurge

# Clean APT
RUN apt-get autoremove -y --purge
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/*

#############################################################

FROM scratch

COPY --from=builder / /

ENV LC_ALL=en_US.UTF-8 \
    LANG=en_US.UTF-8 \
    TERM=xterm \
    DISPLAY=:99 \
    NUGET_XMLDOC_MODE=skip \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    DOTNET_CLI_TELEMETRY_OPTOUT=1

WORKDIR /devextreme
STOPSIGNAL SIGKILL
