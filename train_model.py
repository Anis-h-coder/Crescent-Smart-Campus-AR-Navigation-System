import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator  # type: ignore
from tensorflow.keras.applications import MobileNetV2  # type: ignore
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout # type: ignore
from tensorflow.keras.models import Model # type: ignore
from tensorflow.keras.optimizers import Adam # type: ignore
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

# dataset path
dataset_path = "dataset"

# image settings
IMG_SIZE = (224,224)
BATCH_SIZE = 16

# data augmentation
datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=25,
    zoom_range=0.3,
    shear_range=0.15,
    horizontal_flip=True,
    brightness_range=[0.7,1.3],
    fill_mode="nearest"
)

# training data
train_data = datagen.flow_from_directory(
    dataset_path,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    subset="training",
    shuffle=True
)

# validation data
val_data = datagen.flow_from_directory(
    dataset_path,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    subset="validation",
    shuffle=False
)

num_classes = train_data.num_classes

# base model
base_model = MobileNetV2(
    input_shape=(224,224,3),
    include_top=False,
    weights="imagenet"
)

# freeze layers
for layer in base_model.layers:
    layer.trainable = False

# custom classifier
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation="relu")(x)
x = Dropout(0.4)(x)
predictions = Dense(num_classes, activation="softmax")(x)

model = Model(inputs=base_model.input, outputs=predictions)

# compile model
model.compile(
    optimizer=Adam(learning_rate=0.0001),
    loss="categorical_crossentropy",
    metrics=[
        "accuracy",
        tf.keras.metrics.Precision(name="precision"),
        tf.keras.metrics.Recall(name="recall")
    ]
)

model.summary()

# train model
history = model.fit(
    train_data,
    validation_data=val_data,
    epochs=25
)

# save model
model.save("landmark_model.h5")

print("Model training completed and saved as landmark_model.h5")
print("Class labels:", train_data.class_indices)

# predictions for evaluation
y_pred = model.predict(val_data)
y_pred_classes = np.argmax(y_pred, axis=1)
y_true = val_data.classes

class_names = list(train_data.class_indices.keys())

# classification report (precision, recall, f1-score)
print("\nClassification Report:")
print(classification_report(y_true, y_pred_classes, target_names=class_names))

# confusion matrix
cm = confusion_matrix(y_true, y_pred_classes)

print("\nConfusion Matrix:")
print(cm)