import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import numpy as np
import io
import pickle
import boto3
import os
import logging

log = logging.getLogger()
log.setLevel(logging.INFO)


def _build_models():
    log.info("Starting model training")
    date_today = pd.to_datetime('today').strftime('%Y-%m-%d')
    aggregate_file_key = f'aggregates/{date_today}-aggregate-data.csv'

    env_data_string = _load_aggregate_data(aggregate_file_key)
    log.info("Loaded aggregate data from s3")
    env_data_df = pd.read_csv(env_data_string)

    _build_store_models(env_data_df)


def _build_store_models(env_data_df):
    log.info("Building temperature model")
    date_today = pd.to_datetime('today').strftime('%Y-%m-%d')
    temp_model_name = f'{date_today}-temperature_model.pkl'
    temperature_model = _build_model(env_data_df[['day_of_week', 'time_of_day', 'humidity', 'pressure']],
                                     env_data_df['temperature'])

    log.info("Storing temperature model")
    _store_model_s3(temperature_model, temp_model_name)

    log.info("Building humidity model")
    hum_model_name = f'{date_today}-humidity_model.pkl'
    humidity_model = _build_model(env_data_df[['day_of_week', 'time_of_day', 'temperature', 'pressure']],
                                  env_data_df['humidity'])

    log.info("Storing humidity model")
    _store_model_s3(humidity_model, hum_model_name)

    log.info("Building pressure model")
    pressure_model_name = f'{date_today}-pressure_model.pkl'
    pressure_model = _build_model(env_data_df[['day_of_week', 'time_of_day', 'humidity', 'temperature']],
                                  env_data_df['pressure'])

    log.info("Storing pressure model")
    _store_model_s3(pressure_model, pressure_model_name)


def _build_model(train_features_df, predict_feature_df):
    x_train, x_test, y_train, y_test = train_test_split(train_features_df, predict_feature_df, test_size=0.2,
                                                        random_state=42)
    model = LinearRegression()
    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    accuracy = model.score(x_test, y_test)
    log.info(f"Model Accuracy: {accuracy}")
    log.info(f"Root Mean Squared Error: {np.sqrt(mean_squared_error(y_test, y_pred))}")

    return model


# TODO: Should this go in data_store.py?
def _store_model_s3(model, model_name):
    with io.BytesIO() as f:
        pickle.dump(model, f)
        f.seek(0)  # Move to the beginning of the in-memory file

        s3_client = boto3.client('s3')
        bucket_name = os.getenv('S3_BUCKET')
        object_name = f'models/{model_name}'
        s3_client.upload_fileobj(f, bucket_name, object_name)


def _load_aggregate_data(file_key):
    log.info(f"Loading aggregate data from s3: {file_key}")
    s3 = boto3.client('s3')
    bucket_name = os.getenv('S3_BUCKET')
    obj = s3.get_object(Bucket=bucket_name, Key=file_key)
    env_content = obj['Body'].read().decode('utf-8')
    return env_content


if __name__ == "__main__":
    _build_models()
