import cv2
import os
import numpy as np
from sklearn.model_selection import train_test_split

# Nastavitve
DATA_DIRS = ["data_preprocessed", "data_augmented"]  # Prilagodite
TEST_SIZE = 0.2  # 20% za testiranje

# Priprava podatkov
label_map = {}
faces, labels = [], []
label_counter = 0

for data_dir in DATA_DIRS:
    for person_name in os.listdir(data_dir):
        person_dir = os.path.join(data_dir, person_name)
        if not os.path.isdir(person_dir):
            continue
        
        # Dodaj osebo v label_map
        if person_name not in label_map:
            label_map[person_name] = label_counter
            label_counter += 1
        
        # Naloži slike
        for img_name in os.listdir(person_dir):
            img_path = os.path.join(person_dir, img_name)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                print(f"Napaka pri nalaganju: {img_path}")
                continue
            
            faces.append(img)
            labels.append(label_map[person_name])
            
# Pretvori v numpy array
faces = np.array(faces)
labels = np.array(labels)

# Razdeli podatke na učne in testne
X_train, X_test, y_train, y_test = train_test_split(
    faces, labels, test_size=TEST_SIZE, random_state=42
)

# Ustvari in treniraj model
model = cv2.face.LBPHFaceRecognizer_create()
model.train(X_train.tolist(), y_train.tolist())

# Shrani model
model.write("lbph_model.yml")

# Testiraj model na testnem setu
correct = 0
for i, test_img in enumerate(X_test):
    true_label = y_test[i]
    predicted_label, confidence = model.predict(test_img)
    if predicted_label == true_label:
        correct += 1

accuracy = (correct / len(X_test)) * 100
print(f"Natančnost na testnem setu: {accuracy:.2f}%")