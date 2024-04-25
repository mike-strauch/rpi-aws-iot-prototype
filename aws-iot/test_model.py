from sklearn.linear_model import LinearRegression
import pickle


with open('2024-04-08-humidity-model.pkl', 'rb') as file:
    model = pickle.load(file)

x_range = [[10000, 23.42, 1021, 1, 0, 0, 0, 0, 0, 0 ],
           [12000, 25.42, 1022, 1, 0, 0, 0, 0, 0, 0 ]]
# Check if the model has the method get_feature_names_out
if hasattr(model, 'get_feature_names_out'):
    try:
        feature_names = model.get_feature_names_out()
        print("Feature names:", feature_names)
    except AttributeError:
        print("The model does not have feature names stored.")
else:
    print("The model or scikit-learn version does not support get_feature_names_out.")
print(model.predict(x_range))
