import cv2
import os
import sys
import numpy as np
from sklearn.model_selection import train_test_split
import requests

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # točka znotraj backend/scripts
MODEL_DIR = os.path.normpath(os.path.join(BASE_DIR, 'models'))

print(f"[DEBUG][INIT] BASE_DIR: {BASE_DIR}")
print(f"[DEBUG][INIT] MODEL_DIR: {MODEL_DIR}")

TEST_SIZE = 0.2
IMAGE_SIZE = (100, 100)
BACKEND_URL = "http://localhost:3001"
UPDATE_FACE_MODEL_ENDPOINT = "/api/users/update_model"

def train_and_save_model_for_user(user_id, image_paths):
    faces, labels = [], []

    for idx, img_path in enumerate(image_paths):
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        try:
            img_resized = cv2.resize(img, IMAGE_SIZE)
        except Exception as e:
            continue
        faces.append(img_resized)
        labels.append(0)

    if len(faces) < 2:
        return None

    faces = np.array(faces)
    labels = np.array(labels)

    # Razdelitev na učno in testno množico
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            faces, labels, test_size=TEST_SIZE, random_state=42
        )
    except Exception as e:
        return None

    try:
        model = cv2.face.LBPHFaceRecognizer_create()
        model.train(X_train, y_train)
    except Exception as e:
        return None

    if not os.path.exists(MODEL_DIR):
        try:
            os.makedirs(MODEL_DIR, exist_ok=True)
        except Exception as e:
            return None
    else:
        print(f"[DEBUG][train_and_save_model_for_user] Mapa za modele že obstaja: {MODEL_DIR}")

    model_path = os.path.join(MODEL_DIR, f"{user_id}.yml")
    try:
        model.write(model_path)
    except Exception as e:
        return None

    try:
        correct = sum(1 for i, img in enumerate(X_test) if model.predict(img)[0] == y_test[i])
        accuracy = (correct / len(X_test)) * 100
    except Exception as e:
        print(f"[DEBUG][train_and_save_model_for_user] Napaka pri oceni modela: {e}")

    return model_path

def update_model_path_in_backend(user_id, model_path):
    url = BACKEND_URL + UPDATE_FACE_MODEL_ENDPOINT
    payload = {
        "userId": user_id,
        "faceModelPath": model_path
    }
    try:
        resp = requests.post(url, json=payload)
        if resp.status_code == 200:
            print(f"[DEBUG][update_model_path_in_backend] faceModel pot za '{user_id}' posodobljena v bazi.")
        else:
            print(f"[DEBUG][update_model_path_in_backend] Napaka pri posodabljanju baze: {resp.status_code} → {resp.text}")
    except Exception as ex:
        print(f"[DEBUG][update_model_path_in_backend] HTTP napaka: {ex}")

def main():
    print("[DEBUG][main] Zacenjam recognition_model.py ...")
    print(f"[DEBUG][main] Trenutni delovni direktorij: {os.getcwd()}")
    print(f"[DEBUG][main] BASE_DIR: {BASE_DIR}")
    print(f"[DEBUG][main] MODEL_DIR: {MODEL_DIR}")

    if len(sys.argv) < 2:
        raise RuntimeError("Pokliči: python recognition_model.py <pot_do_data_dir_for_single_user>")

    BASE_DATA_DIR = sys.argv[1]
    print(f"[DEBUG][main] Prejeto sys.argv[1]: {BASE_DATA_DIR}")

    if not os.path.exists(BASE_DATA_DIR):
        raise RuntimeError(f"Directory '{BASE_DATA_DIR}' ne obstaja.")

    # Iz imena mape izluščimo user_id
    user_id = os.path.basename(BASE_DATA_DIR.rstrip("/\\"))

    try:
        all_files = os.listdir(BASE_DATA_DIR)
    except Exception as e:
        print(f"[DEBUG][main] Napaka pri branju vsebine mape '{BASE_DATA_DIR}': {e}")
        return

    image_paths = [
        os.path.join(BASE_DATA_DIR, f)
        for f in all_files
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]

    if not image_paths:
        print(f"[DEBUG][main] Ni slik v '{BASE_DATA_DIR}'. Preskakujem treniranje.")
        return

    model_path = train_and_save_model_for_user(user_id, image_paths)
    if not model_path:
        print(f"[DEBUG][main] Model za user_id '{user_id}' ni bil ustvarjen (vrnjeno None).")
        return

    update_model_path_in_backend(user_id, model_path)
    
if __name__ == "__main__":
    main()