import json
import logging
import os

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

QUEUE_URL = os.getenv('QUEUE_URL')
SQS = boto3.client('sqs')
S3 = boto3.client('s3')


def data_appender(event, context):
    logger.debug('Got a data appender event')
    for record in event['Records']:
        logger.info(f'Message body: {record["body"]}')


def event_receiver(event, context):
    logger.debug('Got an event_receiver event')
    logger.debug('Event is:')
    logger.debug(event)
    status_code = 200
    if not event:
        return {'statusCode': 400, 'body': json.dumps({'message': 'No body was found'})}

    logger.debug('QUEUE_URL is ' + QUEUE_URL)

    try:
        SQS.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(event)
        )
        message = 'Message accepted!'
    except Exception as e:
        logger.exception('Sending message to SQS queue failed!')
        message = str(e)
        status_code = 500

    return {'statusCode': status_code, 'body': json.dumps({'message': message})}
