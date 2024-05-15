import importlib

S3_BUCKET = 'test-bucket'
AWS_REGION = 'us-west-1'


def setup_aws(monkeypatch, additional_vars=None):
    all_variables = {
        'S3_BUCKET': S3_BUCKET,
        'AWS_DEFAULT_REGION': AWS_REGION
    }
    if additional_vars:
        all_variables.update(additional_vars)

    _setup_environment(monkeypatch, all_variables)


def _setup_environment(monkeypatch, vars_to_set):
    for key, value in vars_to_set.items():
        monkeypatch.setenv(key, value)

    # These modules must be reloaded after the environment variables are set otherwise they will have blank values
    # for static variables.
    import api
    importlib.reload(api)

    import data_store
    importlib.reload(data_store)
