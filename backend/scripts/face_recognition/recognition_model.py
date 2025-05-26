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