import boto3
from api import fetch_device, fetch_devices, fetch_metrics, fetch_predictions
from moto import mock_aws
import json
from data_store import append_data_as_json
from datetime import datetime
import aws_helper

S3_BUCKET = 'test-bucket'
AWS_REGION = 'us-west-1'


@mock_aws
def test_fetch_device():
    device_name = 'TestThing'
    thing_type_name = 'TestDevice'
    iot = boto3.client('iot')
    iot.create_thing_type(thingTypeName=thing_type_name)
    iot.create_thing(thingName=device_name, thingTypeName=thing_type_name)

    response = fetch_device({'pathParameters': {'deviceId': device_name}}, None)
    assert response['statusCode'] == 200
    assert response['body'] == '{"name": "TestThing", "version": 1, "type": "TestDevice"}'
    _assert_cors(response)

    response = fetch_device({'pathParameters': {}}, None)
    assert response['statusCode'] == 400
    assert response['body'] == '{"message": "No device ID provided"}'

    response = fetch_device({'pathParameters': {'deviceId': 'NonExistentDevice'}}, None)
    assert response['statusCode'] == 404
    assert response['body'] == '{"message": "Device not found"}'


@mock_aws
def test_fetch_devices():
    response = fetch_devices({}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"devices": []}

    device_name = 'TestThing'
    thing_type_name = 'TestDevice'
    iot = boto3.client('iot')
    iot.create_thing_type(thingTypeName=thing_type_name)
    iot.create_thing(thingName=device_name, thingTypeName=thing_type_name)

    response = fetch_devices({}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"devices": [{"name": "TestThing", "version": 1, "type": "TestDevice"}]}
    _assert_cors(response)


@mock_aws
def test_fetch_metrics(monkeypatch):
    aws_helper.setup_aws(monkeypatch)
    s3 = boto3.client('s3')
    s3.create_bucket(Bucket=S3_BUCKET, CreateBucketConfiguration={'LocationConstraint': AWS_REGION})

    response = fetch_metrics({'queryStringParameters': {'date': 'invalid_date'}}, None)
    assert response['statusCode'] == 400
    assert response['body'] == '{"message": "Invalid date parameter"}'

    date_today = datetime.now().strftime("%Y-%m-%d")
    response = fetch_metrics({'queryStringParameters': {'date': date_today}}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"entries": []}
    _assert_cors(response)

    append_data_as_json([{'t': 234234234, 'tmp': 24.5}], date_today)
    response = fetch_metrics({'queryStringParameters': {'date': date_today}}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"entries": [{"t": 234234234, "tmp": 24.5}]}
    _assert_cors(response)

    response = fetch_metrics({'queryStringParameters': {'date': '2023-05-03'}}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"entries": []}
    _assert_cors(response)


@mock_aws
def test_fetch_predictions(monkeypatch):
    aws_helper.setup_aws(monkeypatch)
    s3 = boto3.client('s3')
    s3.create_bucket(Bucket=S3_BUCKET, CreateBucketConfiguration={'LocationConstraint': AWS_REGION})

    response = fetch_predictions({'queryStringParameters': {'date': 'invalid_date'}}, None)
    assert response['statusCode'] == 400
    assert response['body'] == '{"message": "Invalid date parameter"}'

    date_today = datetime.now().strftime("%Y-%m-%d")
    response = fetch_predictions({'queryStringParameters': {'date': date_today}}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"entries": []}
    _assert_cors(response)

    append_data_as_json([{'t': 234234234, 'tmp': 24.5}], date_today + '-predictions')
    response = fetch_predictions({'queryStringParameters': {'date': date_today}}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"entries": [{"t": 234234234, "tmp": 24.5}]}
    _assert_cors(response)

    response = fetch_predictions({'queryStringParameters': {'date': '2023-05-03'}}, None)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {"entries": []}
    _assert_cors(response)


def _assert_cors(response):
    assert 'Access-Control-Allow-Origin' in response['headers']
    assert response['headers']['Access-Control-Allow-Origin'] == '*'
    assert 'Access-Control-Allow-Credentials' in response['headers']
    assert response['headers']['Access-Control-Allow-Credentials'] == True

