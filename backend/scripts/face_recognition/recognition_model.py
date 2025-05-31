import cv2
import os
import numpy as np
from sklearn.model_selection import train_test_split
import requests

BASE_DATA_DIR = "data"
MODEL_DIR = "models"
TEST_SIZE = 0.2
IMAGE_SIZE = (100, 100)
BACKEND_URL = "http://localhost:3000"
UPDATE_FACE_MODEL_ENDPOINT = "/api/users/update_model"

def train_and_save_model_for_user(user_id, image_paths):
    faces, labels = [], []

    for img_path in image_paths:
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        img_resized = cv2.resize(img, IMAGE_SIZE)
        faces.append(img_resized)
        labels.append(0)

    if len(faces) < 2:
        return None

    faces = np.array(faces)
    labels = np.array(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        faces, labels, test_size=TEST_SIZE, random_state=42
    )

    model = cv2.face.LBPHFaceRecognizer_create()
    model.train(X_train, y_train)

    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    model_path = os.path.join(MODEL_DIR, f"{user_id}.yml")
    model.write(model_path)

    correct = sum(1 for i, img in enumerate(X_test) if model.predict(img)[0] == y_test[i])
    accuracy = (correct / len(X_test)) * 100
    print(f"[{user_id}] Model saved: {model_path}, Accuracy: {accuracy:.2f}%")

    return model_path