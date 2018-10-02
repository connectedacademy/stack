FROM ubuntu:16.04

# Install Python
RUN apt-get update && \
    apt-get -y install python python-pip

# Install AWS CLI and schedule package
RUN pip install awscli schedule

# Install MongoDB tools
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
RUN bash -c 'echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/4.0 multiverse" > /etc/apt/sources.list.d/mongodb.list'
RUN cat /etc/apt/sources.list.d/mongodb.list
RUN apt-get install -y apt-transport-https
RUN apt update
RUN apt install -y mongodb-org

# Add scripts
ADD backup.sh /app/backup.sh
ADD run.py /app/run.py
RUN chmod +x /app/backup.sh
RUN chmod +x /app/run.py

# Default environment variables
ENV BACKUP_INTERVAL 1
ENV BACKUP_TIME 16:18
ENV DATE_FORMAT %Y%m%d-%H%M%S
ENV FILE_PREFIX backup-

# Run the schedule command on startup
CMD ["python", "-u", "/app/run.py"]
