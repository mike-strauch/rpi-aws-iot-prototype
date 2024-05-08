import json
import logging
import os
import re
import boto3
from datetime import datetime

from data_store import load_file_as_json, append_data_as_json

log = logging.getLogger()
log.setLevel(logging.INFO)

SQS = boto3.client('sqs')
QUEUE_URL = os.getenv('QUEUE_URL')


# Internal Lambda Functions
def event_receiver(event, context):
    log.debug('Got an event_receiver event')
    log.debug(f'Event is: {event}')
    if not event:
        return _default_response(400, {'message': 'No event data was found'})

    try:
        SQS.send_message(QueueUrl=QUEUE_URL, MessageBody=json.dumps(event))
        return _default_response(200, {'message': 'data received'})
    except Exception as e:
        log.exception('Sending message to SQS queue failed!')
        return _default_response(500, {'error': str(e)})


def data_appender(event, context):
    log.debug('Got a data appender event')
    data_points = [json.loads(record['body']) for record in event['Records']]
    if not len(data_points):
        log.debug("No data points contained in event data, skipping")
        return

    # Could use the time in the data to decide which file to append to, but for now we'll just use the current date
    file_key = datetime.now().strftime("%Y-%m-%d")
    log.debug(f'Appending {len(data_points)} data points to file with key {file_key}')
    try:
        append_data_as_json(data_points, file_key)
    except Exception as e:
        log.error(f"An error occurred while appending data to file with key {file_key}: {e}")


def fetch_devices(event, context):
    client = boto3.client('iot')
    log.debug('Fetching all devices')
    try:
        response = client.list_things()
        things = response['things']
        result = {"devices": []}

        for thing in things:
            result["devices"].append({
                "name": thing['thingName'],
                "version": thing['version'],
                "type": thing['thingTypeName']
            })

        log.info(f"Devices fetched successfully: {result}")
        return _default_cors_response(200, result)
    except Exception:
        log.error(f"An error occurred", exc_info=True)
        return _default_cors_response(500, {'message': 'An error occurred while listing devices.'})


def fetch_device(event, context):
    path_params = event.get('pathParameters', {})
    device_id = path_params.get('user_id')

    if not device_id:
        return _default_cors_response(400, {'message': 'No device ID provided'})

    log.debug(f'Fetching data for device with ID {device_id}')
    return _default_cors_response(200, {'device_id': device_id})


# HTTP accessible Lambda Functions
def fetch_metrics(event, context):
    # IMPROVEMENT: This function now receives a deviceId parameter when called which can be used to retrieve
    # data for a specific device.
    log.debug('Got a fetch_data event')
    query_string_params = event.get('queryStringParameters', {})
    date_param = '' if not query_string_params else query_string_params.get('date', '')
    if date_param and not _date_valid(date_param):
        return _default_cors_response(400, {'message': 'Invalid date parameter'})

    return _fetch_metrics_for_date(date_param)


def fetch_predictions(event, context):
    # IMPROVEMENT: This function now receives a deviceId parameter when called which can be used to retrieve
    # data for a specific device.
    log.debug('Got a fetch_predictions event')
    query_string_params = event.get('queryStringParameters', {})
    date_param = '' if not query_string_params else query_string_params.get('date', '')
    if date_param and not _date_valid(date_param):
        return _default_cors_response(400, {'message': 'Invalid date parameter'})

    return _fetch_predictions_for_date(date_param)


def _fetch_metrics_for_date(date_str):
    # default to today's date if date provided is empty which is different from it being invalid
    file_key = date_str or datetime.now().strftime("%Y-%m-%d")
    return _fetch_metrics_from_file(file_key)


def _fetch_predictions_for_date(date_str):
    # default to today's date if date provided is empty which is different from it being invalid
    file_key = (date_str or datetime.now().strftime("%Y-%m-%d")) + '-predictions'
    return _fetch_metrics_from_file(file_key)


def _fetch_metrics_from_file(file_key):
    log.debug(f'Fetching data for file with key {file_key}')
    try:
        json_data = load_file_as_json(file_key)
        log.debug(f"File \'{file_key}\' fetched {'successfully' if json_data else 'unsuccessfully'}.")
        return _default_cors_response(200, json_data)

    except Exception as e:
        log.error(f"An error occurred while fetching file with key {file_key}: {e}")
        return _default_cors_response(500, str(e))


def _date_valid(date_str):
    if not date_str:
        return False
    pattern = r'^\d{4}-\d{2}-\d{2}$'
    return re.match(pattern, date_str)


def _default_response(status, response_body_json):
    return {
        'statusCode': status,
        'body': json.dumps(response_body_json),
        'headers': {
            'Content-Type': 'application/json',
        }
    }


def _default_cors_response(status, response_body_json):
    default_response = _default_response(status, response_body_json)
    default_response['headers']['Access-Control-Allow-Origin'] = '*'
    default_response['headers']['Access-Control-Allow-Credentials'] = True
    return default_response
