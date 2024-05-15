from api import event_receiver, data_appender
from moto import mock_aws
import json
import boto3
from datetime import datetime
import aws_helper

S3_BUCKET = 'test-bucket'
AWS_REGION = 'us-west-1'


@mock_aws
def test_event_receiver(monkeypatch):
    sqs = boto3.client('sqs')
    mock_queue = _create_mock_queue(sqs)
    aws_helper.setup_aws(monkeypatch, {
        'QUEUE_URL': mock_queue['QueueUrl']
    })

    event = {"t": 12345, "tmp": 28, "hum": 54.6, "pr": 1013.25}
    response = event_receiver(event, None)

    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {
        "message": "data received"
    }

    messages = sqs.receive_message(QueueUrl=mock_queue['QueueUrl'], MaxNumberOfMessages=1)
    assert 'Messages' in messages
    assert len(messages['Messages']) == 1
    message = messages['Messages'][0]
    assert message['Body'] == json.dumps(event)


@mock_aws
def test_event_receiver_no_event():
    response = event_receiver(None, None)
    assert response['statusCode'] == 400
    assert json.loads(response['body']) == {
        "message": "No event data was found"
    }

    response = event_receiver({}, None)
    assert response['statusCode'] == 400
    assert json.loads(response['body']) == {
        "message": "No event data was found"
    }


@mock_aws
def test_event_receiver_sqs_send_message_failure():
    # queue is not set up, so sending message will fail
    response = event_receiver({'t': 1234}, None)
    assert response['statusCode'] == 500
    assert 'error' in response['body']


@mock_aws
def test_data_appender_no_starting_data(monkeypatch):
    aws_helper.setup_aws(monkeypatch)
    s3 = boto3.client('s3')
    s3.create_bucket(Bucket=S3_BUCKET, CreateBucketConfiguration={'LocationConstraint': AWS_REGION})

    data_points = {"entries": [{"t": 12345, "tmp": 28, "hum": 54.6, "pr": 1013.25}]}
    data_appender({
        "Records": [{"body": json.dumps(data_points['entries'][0])}]
    }, None)

    date_today = datetime.now().strftime("%Y-%m-%d")
    data_file = s3.get_object(Bucket=S3_BUCKET, Key=date_today)
    assert data_file is not None

    data = json.loads(data_file['Body'].read())
    assert data == data_points


@mock_aws
def test_data_appender_existing_data_set(monkeypatch):
    aws_helper.setup_aws(monkeypatch)
    s3 = boto3.client('s3')
    s3.create_bucket(Bucket=S3_BUCKET, CreateBucketConfiguration={'LocationConstraint': AWS_REGION})
    date_today = datetime.now().strftime("%Y-%m-%d")

    existing_data_points = {"entries": [{"t": 12345, "tmp": 28, "hum": 54.6, "pr": 1013.25}]}
    s3.put_object(Bucket=S3_BUCKET, Key=date_today, Body=json.dumps(existing_data_points))

    appended_data_point = {"t": 54321, "tmp": 30, "hum": 60, "pr": 1014.25}
    data_appender({
        "Records": [{"body": json.dumps(appended_data_point)}]
    }, None)

    data_file = s3.get_object(Bucket=S3_BUCKET, Key=date_today)
    assert data_file is not None

    data = json.loads(data_file['Body'].read())
    all_data_points = existing_data_points["entries"] + [appended_data_point]
    assert data == {"entries": all_data_points}


@mock_aws
def test_data_appender_no_datapoints(monkeypatch):
    aws_helper.setup_aws(monkeypatch)
    s3 = boto3.client('s3')
    s3.create_bucket(Bucket=S3_BUCKET, CreateBucketConfiguration={'LocationConstraint': AWS_REGION})

    data_appender({
        "Records": []
    }, None)

    date_today = datetime.now().strftime("%Y-%m-%d")
    try:
        s3.get_object(Bucket=S3_BUCKET, Key=date_today)
        assert False, "Data file should not exist"
    except s3.exceptions.NoSuchKey:
        assert True, "Data file does not exist"


def _create_mock_queue(sqs):
    queue_name = 'my-test-queue'
    return sqs.create_queue(QueueName=queue_name)

