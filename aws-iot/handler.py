import json
import logging
import os
import re
from datetime import datetime
from io import BytesIO

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SQS = boto3.client('sqs')
S3 = boto3.client('s3')

QUEUE_URL = os.getenv('QUEUE_URL')
S3_BUCKET = os.getenv('S3_BUCKET')
EMPTY_JSON_ARRAY = '{"entries":[]}'


# Internal Lambda Functions (some private methods are shared)
def data_appender(event, context):
    logger.debug('Got a data appender event')
    data_points = [json.loads(record['body']) for record in event['Records']]
    _append_to_s3_file(data_points)


def _append_to_s3_file(data_points):
    if not len(data_points):
        logger.debug("No data points contained in event data, skipping")
        return

    # Could use the time in the data to decide which file to append to, but for now we'll just use the current date
    file_key = datetime.now().strftime("%Y-%m-%d")
    logger.debug(f'Appending {len(data_points)} data points to file with key {file_key}')
    try:
        json_data = _load_json_datafile(file_key) or json.loads(EMPTY_JSON_ARRAY)
        json_data['entries'].extend(data_points)
        _store_json_datafile(file_key, json_data)
        print(f"File '{file_key}' in bucket '{S3_BUCKET}' updated successfully.")

    except Exception as e:
        print(f"An error occurred while appending data to file with key {file_key}: {e}")


def _load_json_datafile(file_key):
    file_obj = _safe_load_file(file_key)
    logger.debug(f'File object {"exists" if file_obj else "does not exist"}')
    if not file_obj:
        return None

    file_content = file_obj['Body'].read().decode('utf-8')
    json_data = json.loads(file_content)
    return json_data


def _safe_load_file(file_key):
    try:
        logger.debug(f"Checking if file {file_key} exists in {S3_BUCKET}")
        S3.head_object(Bucket=S3_BUCKET, Key=file_key)
        logger.debug(f"File {file_key} exists in {S3_BUCKET}.")
        return S3.get_object(Bucket=S3_BUCKET, Key=file_key)
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404' or error_code == 'NoSuchKey':
            logger.debug(f"File {file_key} does not exist in {S3_BUCKET}.")
        else:
            logger.debug(f"An error occurred while safe loading file {file_key} from {S3_BUCKET}: {e}")

        return None
    except Exception as e:
        logger.debug(f"An error occurred while safe loading file {file_key} from {S3_BUCKET}: {e}")
        return None


def _store_json_datafile(file_key, json_data):
    updated_file_content = json.dumps(json_data).encode('utf-8')
    S3.put_object(Bucket=S3_BUCKET, Key=file_key, Body=BytesIO(updated_file_content))


def event_receiver(event, context):
    logger.debug('Got an event_receiver event')
    logger.debug('Event is:')
    logger.debug(event)
    status_code = 200
    if not event:
        return _default_response(400, {'message': 'No body was found'})

    logger.debug(f'QUEUE_URL is {QUEUE_URL}')

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

    return _default_response(status_code, {'message': message})


# HTTP accessible Lambda Functions
def fetch_data(event, context):
    logger.debug('Got a fetch_data event')
    query_string_params = event.get('queryStringParameters', {})
    date_param = '' if not query_string_params else query_string_params.get('date', '')
    if date_param and not _date_valid(date_param):
        return _default_response(400, {'message': 'Invalid date parameter'})

    return _fetch_data_for_date(date_param)


def _fetch_data_for_date(date_str):
    # default to today's date if date provided is empty which is different from it being invalid
    file_key = date_str if date_str else datetime.now().strftime("%Y-%m-%d")
    logger.debug(f'Fetching data for file with key {date_str} from bucket {S3_BUCKET}')
    try:
        json_data = _load_json_datafile(file_key)
        logger.debug(f"File \'{file_key}\' in bucket \'{S3_BUCKET}\' fetched {'successfully' if json_data else 'unsuccessfully'}.")
        return _default_response(200, json_data)

    except Exception as e:
        logger.error(f"An error occurred while fetching file with key {file_key}: {e}")
        return _default_response(500, str(e))


def _date_valid(date_str):
    if not date_str:
        return False
    pattern = r'^\d{4}-\d{2}-\d{2}$'
    return re.match(pattern, date_str)


def _default_response(status, response_body):
    return {
        'statusCode': status,
        'body': json.dumps(response_body),
        'headers': {
            'Content-Type': 'application/json',
        }
    }



