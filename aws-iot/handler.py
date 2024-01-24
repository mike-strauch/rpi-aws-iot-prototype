import json
import logging
import os
from datetime import datetime
from io import BytesIO

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

QUEUE_URL = os.getenv('QUEUE_URL')
SQS = boto3.client('sqs')
S3 = boto3.client('s3')

# Put in config file somewhere
S3_DATA_BUCKET = 'rpi-atmospheric-data'
EMPTY_JSON_ARRAY = '{"entries":[]}'


def data_appender(event, context):
    logger.debug('Got a data appender event')
    data_points = [record['body'] for record in event['Records']]
    if len(data_points) == 0:
        logger.debug("No data points contained in event data, skipping")
        return
    append_to_s3_file(data_points)


def append_to_s3_file(data_points):
    file_key = datetime.now().strftime("%Y-%m-%d")
    logger.debug(f'Appending {len(data_points)} data points to file with key {file_key}')

    try:
        json_data = load_json_datafile(file_key)
        json_data['entries'].extend(data_points)
        store_json_datafile(file_key, json_data)
        print(f"File '{file_key}' in bucket '{S3_DATA_BUCKET}' updated successfully.")

    except Exception as e:
        print(f"An error occurred while storing file with key {file_key}: {e}")


def load_json_datafile(file_key):
    file_obj = safe_load_file(file_key)
    file_content = file_obj['Body'].read().decode('utf-8') if file_obj else EMPTY_JSON_ARRAY
    json_data = json.loads(file_content)
    return json_data


def safe_load_file(file_key):
    try:
        S3.head_object(Bucket=S3_DATA_BUCKET, Key=file_key)
        logger.debug(f"File {file_key} exists in {S3_DATA_BUCKET}.")
        return S3.get_object(Bucket=S3_DATA_BUCKET, Key=file_key)
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404' or error_code == 'NoSuchKey':
            print(f"File {file_key} does not exist in {S3_DATA_BUCKET}.")

        return None


def store_json_datafile(file_key, json_data):
    updated_file_content = json.dumps(json_data).encode('utf-8')
    S3.put_object(Bucket=S3_DATA_BUCKET, Key=file_key, Body=BytesIO(updated_file_content))


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
