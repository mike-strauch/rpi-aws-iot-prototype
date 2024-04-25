import json
import logging
import os
import re
import boto3
from datetime import datetime

from data_store import load_datafile_as_json, append_data_to_file

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SQS = boto3.client('sqs')
QUEUE_URL = os.getenv('QUEUE_URL')


# Internal Lambda Functions
def event_receiver(event, context):
    logger.debug('Got an event_receiver event')
    logger.debug(f'Event is: {event}')
    if not event:
        return _default_response(400, {'message': 'No event data was found'})

    try:
        SQS.send_message(QueueUrl=QUEUE_URL, MessageBody=json.dumps(event))
        return _default_response(200, {'message': 'data received'})
    except Exception as e:
        logger.exception('Sending message to SQS queue failed!')
        return _default_response(500, {'error': str(e)})


def data_appender(event, context):
    logger.debug('Got a data appender event')
    data_points = [json.loads(record['body']) for record in event['Records']]
    if not len(data_points):
        logger.debug("No data points contained in event data, skipping")
        return

    # Could use the time in the data to decide which file to append to, but for now we'll just use the current date
    file_key = datetime.now().strftime("%Y-%m-%d")
    logger.debug(f'Appending {len(data_points)} data points to file with key {file_key}')
    try:
        append_data_to_file(data_points, file_key)
    except Exception as e:
        print(f"An error occurred while appending data to file with key {file_key}: {e}")


# HTTP accessible Lambda Functions
def fetch_metrics(event, context):
    # TODO: This function now receives a deviceId parameter when called which can be used to retrieve
    # data for a specific device.
    logger.debug('Got a fetch_data event')
    query_string_params = event.get('queryStringParameters', {})
    date_param = '' if not query_string_params else query_string_params.get('date', '')
    if date_param and not _date_valid(date_param):
        return _default_cors_response(400, {'message': 'Invalid date parameter'})

    return _fetch_metrics_for_date(date_param)


def fetch_predictions(event, context):
    # TODO: This function now receives a deviceId parameter when called which can be used to retrieve
    # data for a specific device.
    logger.debug('Got a fetch_predictions event')
    query_string_params = event.get('queryStringParameters', {})
    date_param = '' if not query_string_params else query_string_params.get('date', '')
    if date_param and not _date_valid(date_param):
        return _default_cors_response(400, {'message': 'Invalid date parameter'})

    return _fetch_predictions_for_date(date_param)


def _fetch_metrics_for_date(date_str):
    # default to today's date if date provided is empty which is different from it being invalid
    file_key = date_str or datetime.now().strftime("%Y-%m-%d")
    logger.debug(f'Fetching data for file with key {file_key}')
    try:
        json_data = load_datafile_as_json(file_key)
        logger.debug(f"File \'{file_key}\' fetched {'successfully' if json_data else 'unsuccessfully'}.")
        return _default_cors_response(200, json_data)

    except Exception as e:
        logger.error(f"An error occurred while fetching file with key {file_key}: {e}")
        return _default_cors_response(500, str(e))


def _fetch_predictions_for_date(date_str):
    # default to today's date if date provided is empty which is different from it being invalid
    file_key = (date_str or datetime.now().strftime("%Y-%m-%d")) + '-predictions'
    logger.debug(f'Fetching data for file with key {file_key}')
    try:
        json_data = load_datafile_as_json(file_key)
        logger.debug(f"File \'{file_key}\' fetched {'successfully' if json_data else 'unsuccessfully'}.")
        return _default_cors_response(200, json_data)

    except Exception as e:
        logger.error(f"An error occurred while fetching file with key {file_key}: {e}")
        return _default_cors_response(500, str(e))


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


def _default_cors_response(status, response_body):
    default_response = _default_response(status, response_body)
    default_response['headers']['Access-Control-Allow-Origin'] = '*'
    default_response['headers']['Access-Control-Allow-Credentials'] = True
    return default_response
