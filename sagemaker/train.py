import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from io import StringIO
import numpy as np
import io
import pickle
import boto3
import argparse
import tarfile


def _build_models():
    print("Starting model training")

    date_today = pd.to_datetime('today').strftime('%Y-%m-%d')
    aggregate_file_key = f'aggregates/{date_today}-aggregate-data.csv'

    env_data_string = _load_aggregate_env_data(aggregate_file_key)
    print("Loaded aggregate data from s3")
    env_data_df = pd.read_csv(StringIO(env_data_string))
    # one hot encode the day of week column because linear regression model can only deal with ints
    one_hot_days_of_week = pd.get_dummies(env_data_df, columns=['day_of_week'], prefix='', prefix_sep='')

    # Reorder columns to match the order of the days of the week so prediction code can set the correct day of week
    # column to true
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    one_hot_days_of_week = one_hot_days_of_week.reindex(columns=day_order, fill_value=0)

    env_data_df = env_data_df.drop('day_of_week', axis=1)
    env_data_df = pd.concat([env_data_df, one_hot_days_of_week], axis=1)

    print(env_data_df.head())

    _build_store_models(env_data_df)


def _build_store_models(env_data_df):
    print("Building temperature model")
    temperature_model = _build_model(env_data_df.drop('temperature', axis=1),
                                     env_data_df['temperature'])
    print("Storing temperature model")
    _store_model_s3(temperature_model, 'temperature')

    print("Building humidity model")
    humidity_model = _build_model(env_data_df.drop('humidity', axis=1),
                                  env_data_df['humidity'])
    print("Storing humidity model")
    _store_model_s3(humidity_model, 'humidity')

    print("Building pressure model")
    pressure_model = _build_model(env_data_df.drop('pressure', axis=1),
                                  env_data_df['pressure'])
    print("Storing pressure model")
    _store_model_s3(pressure_model, 'pressure')


def _build_model(train_features_df, predict_feature_df):
    x_train, x_test, y_train, y_test = train_test_split(train_features_df, predict_feature_df, test_size=0.2,
                                                        random_state=42)
    model = LinearRegression()
    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    accuracy = model.score(x_test, y_test)
    print(f"Model Accuracy: {accuracy}")
    print(f"Root Mean Squared Error: {np.sqrt(mean_squared_error(y_test, y_pred))}")

    return model


def _store_model_s3(model, model_type):
    inference_script_buffer = _load_inference_script()

    tar_buffer = io.BytesIO()
    date_today = pd.to_datetime('today').strftime('%Y-%m-%d')
    with tarfile.open(fileobj=tar_buffer, mode='w:gz') as tar:
        # Add model to the tar.gz file
        with io.BytesIO() as f:
            pickle.dump(model, f)
            f.seek(0)
            tarinfo_model = tarfile.TarInfo(name=f'{date_today}-{model_type}-model.pkl')
            tarinfo_model.size = len(f.getvalue())
            tar.addfile(tarinfo_model, fileobj=f)
            print('Added model to tar.gz file')

        # Add script.py to the tar.gz file
        tarinfo_script = tarfile.TarInfo(name='script.py')
        tarinfo_script.size = len(inference_script_buffer.getvalue())
        tar.addfile(tarinfo_script, fileobj=inference_script_buffer)
        print('Added inference script to tar.gz file')

    tar_buffer.seek(0)

    object_name = f'models/{date_today}-{model_type}-model.tar.gz'

    s3_client = boto3.client('s3', region_name='us-west-1')
    s3_client.upload_fileobj(tar_buffer, S3_BUCKET, object_name)
    print(f"Model and inference script packaged and uploaded to {object_name}")


def _load_inference_script():
    s3_client = boto3.client('s3', region_name='us-west-1')
    inference_script_key = 'sagemaker/script.py'
    inference_script_buffer = io.BytesIO()
    s3_client.download_fileobj(Bucket=S3_BUCKET, Key=inference_script_key, Fileobj=inference_script_buffer)
    inference_script_buffer.seek(0)  # Rewind to the start of the file after downloading
    return inference_script_buffer


def _load_aggregate_env_data(file_key):
    print(f"Loading aggregate data from s3: {file_key}")
    s3 = boto3.client('s3')
    obj = s3.get_object(Bucket=S3_BUCKET, Key=file_key)
    env_content = obj['Body'].read().decode('utf-8')
    return env_content


if __name__ == "__main__":
    print("building models")
    parser = argparse.ArgumentParser()
    parser.add_argument('--s3_bucket', type=str, default='')
    args = parser.parse_args()
    S3_BUCKET = args.s3_bucket
    _build_models()
