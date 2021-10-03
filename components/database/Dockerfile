# Parent Dockerfile https://github.com/docker-library/mongo/blob/982328582c74dd2f0a9c8c77b84006f291f974c3/3.0/Dockerfile
FROM mongo:latest
# RUN apt-get update && apt-get install -y gawk
# Modify child mongo to use /data/db2 as dbpath (because /data/db wont persist the build)

ENV MONGO_INITDB_ROOT_USERNAME admin
ENV MONGO_INITDB_ROOT_PASSWORD admin

RUN mkdir -p /data/db2 \
    && echo "dbpath = /data/db2" > /etc/mongodb.conf \
    && chown -R mongodb:mongodb /data/db2

COPY ./scripts/collections /data/db2/collections
COPY ./scripts/init.sh /data/db2
RUN chmod +x /data/db2/init.sh

# RUN mongod --port 27017 --bind_ip 127.0.0.1 --fork --logpath /var/log/mongodb.log --config /etc/mongodb.conf \
#     && cd /data/db2/ \
#     && ./init.sh \
#     && mongod --config /etc/mongodb.conf --shutdown

# Make the new dir a VOLUME to persists it
VOLUME /data/db2
EXPOSE 27017
CMD ["mongod", "--config", "/etc/mongodb.conf", "--smallfiles"]

#
#use admin;
#db.createUser(
#  {
#    user: "admin",
#    pwd: "admin",
#    roles:["root"]
#  }
#);