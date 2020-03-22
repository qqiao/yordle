FROM golang:latest

# Update packages
RUN apt-get -y update && apt-get -y dist-upgrade && \
    apt-get -y install curl gnupg build-essential git less nano default-jdk

# Create the gitpod user
RUN useradd -l -u 33333 -G sudo -md /home/gitpod -s /bin/bash -p gitpod gitpod
ENV HOME=/home/gitpod
ENV GOPATH=${HOME}/gopath
RUN echo 'export GOPATH=$''{HOME}/gopath' >> /etc/profile.d/go.sh
RUN echo 'export PATH=$''{GOPATH}/bin:$''{PATH}:/usr/local/go/bin' >> /etc/profile.d/go.sh
WORKDIR $HOME
# custom Bash prompt
RUN { echo && echo "PS1='\[\e]0;\u \w\a\]\[\033[01;32m\]\u\[\033[00m\] \[\033[01;34m\]\w\[\033[00m\] \\\$ '" ; } >> .bashrc

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

### Gitpod user (2) ###
USER gitpod

# Install Google Cloud SDK
RUN curl https://sdk.cloud.google.com > install.sh
RUN bash install.sh --disable-prompts
RUN echo 'source $''{HOME}/google-cloud-sdk/path.bash.inc' >> ${HOME}/.bashrc
RUN echo 'source $''{HOME}/google-cloud-sdk/completion.bash.inc' >> ${HOME}/.bashrc
ENV PATH=${PATH}:${HOME}/google-cloud-sdk/bin:/usr/local/go/bin
RUN gcloud components update && gcloud components install app-engine-go && \
    gcloud components install cloud-datastore-emulator && \
    gcloud components install beta
RUN rm install.sh

# Install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
RUN . ${HOME}/.nvm/nvm.sh && nvm install v13 && npm i -g yarn firebase-tools

# Install app-tools
RUN GOPATH=${GOPATH} go get -u github.com/qqiao/app-tools
