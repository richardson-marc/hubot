FROM node:7.9.0
MAINTAINER Team Automation Engineers

ENV DEBIAN_FRONTEND noninteractive

#install
RUN apt-get update && \
    apt-get install -y jq bash curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

#add repo
ADD . .

#add entrypoint and start up scripts
ADD .docker/usr/local/bin /usr/local/bin

#entrypoint script to set env vars when linking containers for dev
ENTRYPOINT ["/usr/local/bin/entry.sh"]

#Default command to run on start up
CMD ["/usr/local/bin/start-app.sh"]