import pickle
import os
import numpy as np
import json


def model_fn(model_dir):
    model_file_name = os.environ.get('MODEL_FILE_NAME')
    model_path = os.path.join(model_dir, model_file_name)
    print('Loading model from:', model_path)

    try:
        with open(model_path, 'rb') as file:
            model = pickle.load(file)
        return model
    except Exception as e:
        print(f"An error occurred while loading the model: {e}")
        return None


def input_fn(request_body, request_content_type):
    if request_content_type == "application/json":
        input_data = [np.array(json.loads(request_body)['features'])]
        print('Received input data:', input_data)
    else:
        raise ValueError(f"Unsupported content type: {request_content_type}")
    return input_data


# Function to predict
def predict_fn(input_data, model):
    print(f'testing input data: {input_data}')
    predictions = model.predict(input_data)
    return predictions


# Function to format the output
def output_fn(prediction_output, accept):
    if accept == "application/json":
        return json.dumps(prediction_output.tolist()), accept
    elif accept == "text/csv":
        return ','.join([str(i) for i in prediction_output]), accept
    else:
        # Handle other accept types here or raise an exception
        raise RuntimeError(f"Unsupported accept type: {accept}")