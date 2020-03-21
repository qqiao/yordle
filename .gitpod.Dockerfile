FROM golang:latest

# Install Google Cloud SDK
RUN apt-get -y update && apt-get -y dist-upgrade && \
    apt-get -y install lsb-release curl gnupg build-essential git apt-utils apt-transport-https ca-certificates
RUN apt-get -y install default-jdk

# '-l': see https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user
RUN useradd -l -u 33333 -G sudo -md /home/gitpod -s /bin/bash -p gitpod gitpod
ENV HOME=/home/gitpod
WORKDIR $HOME

### Gitpod user (2) ###
USER gitpod

# Install Google Cloud SDK
RUN curl https://sdk.cloud.google.com > install.sh
RUN bash install.sh --disable-prompts
RUN source ${HOME}/.bashrc
RUN gcloud components install app-engine-go
RUN gcloud components list

# Install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
