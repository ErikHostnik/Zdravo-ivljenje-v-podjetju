import os
import cv2
import sys
from mtcnn import MTCNN


def detect_faces(input_folder):
    output_folder = os.path.join(input_folder, 'preprocessed')
    os.makedirs(output_folder, exist_ok=True)  

    detector = MTCNN()

    for file_name in os.listdir(input_folder):
        file_path = os.path.join(input_folder, file_name)
        if not file_name.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue
        
        img = cv2.imread(file_path)
        if img is None:
            print(f"Ne morem prebrati slike {file_path}, preskakujem.")
            continue

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        results = detector.detect_faces(img_rgb)

        if len(results) == 0:
            print(f"Ni bilo zaznanih obrazov v {file_name}")
            continue

        for i, face in enumerate(results):
            x, y, w, h = face['box']
            x, y = max(0, x), max(0, y)
            face_img = img[y:y+h, x:x+w]

            out_path = os.path.join(output_folder, f'{os.path.splitext(file_name)[0]}_face{i}.jpg')
            cv2.imwrite(out_path, face_img)

if __name__ == '__main__':

    input_folder = sys.argv[1]
    detect_faces(input_folder)
