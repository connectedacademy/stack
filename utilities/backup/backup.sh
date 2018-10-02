#!/bin/bash

set -e

: ${MONGO_HOST:?}
: ${MONGO_DB:?}
: ${MONGO_PORT:?}
: ${S3_BUCKET:?}
: ${AWS_ACCESS_KEY_ID:?}
: ${AWS_SECRET_ACCESS_KEY:?}
: ${DATE_FORMAT:?}
: ${FILE_PREFIX:?}
: ${MONGODB_APPLICATION_USER:?}
: ${MONGODB_APPLICATION_PASS:?}

FOLDER=/backup
DUMP_OUT=dump

FILE_NAME=${FILE_PREFIX}$(date -u +${DATE_FORMAT}).tar.gz
S3_KEY=backups/${FILE_NAME}

echo "Creating backup folder..."

rm -fr ${FOLDER} && mkdir -p ${FOLDER} && cd ${FOLDER}

echo "Starting backup..."

mongodump --host=${MONGO_HOST} --db=${MONGO_DB} --port ${MONGO_PORT} -u ${MONGODB_APPLICATION_USER} -p${MONGODB_APPLICATION_PASS} --out=${DUMP_OUT}

echo "Compressing backup..."

tar -zcvf ${FILE_NAME} ${DUMP_OUT} && rm -fr ${DUMP_OUT}

echo "Uploading to S3..."

aws s3api put-object --bucket ${S3_BUCKET} --key ${S3_KEY} --body ${FILE_NAME}

echo "Removing backup file..."

rm -f ${FILE_NAME}

echo "Done!"
