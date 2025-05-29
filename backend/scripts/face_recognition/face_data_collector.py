import cv2 as cv
import os
from mtcnn import MTCNN

def extract_and_save_face(image_path, output_folder, size=(224, 224)):
    detector = MTCNN()

    # Preberi sliko
    image = cv.imread(image_path)
    if image is None:
        print(f"Napaka: ne morem odpreti {image_path}")
        return False

    image_rgb = cv.cvtColor(image, cv.COLOR_BGR2RGB)
    results = detector.detect_faces(image_rgb)

    if len(results) == 0:
        print(f"Obraz ni zaznan v {image_path}")
        return False

    # Prvi zaznan obraz
    x1, y1, width, height = results[0]['box']
    x2, y2 = x1 + width, y1 + height

    # Preveri meje slike
    h, w, _ = image.shape
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    face = image[y1:y2, x1:x2]
    face = cv.resize(face, size)

    # Shrani izrezan obraz
    filename = os.path.basename(image_path)
    output_path = os.path.join(output_folder, f"face_{filename}")
    cv.imwrite(output_path, face)
    print(f"Shranjeno: {output_path}")

    return True

def process_folder(input_folder, output_folder):
    os.makedirs(output_folder, exist_ok=True)
    images = [f for f in os.listdir(input_folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    for img_file in images:
        img_path = os.path.join(input_folder, img_file)
        extract_and_save_face(img_path, output_folder)

if __name__ == '__main__':
    input_folder = './input_images'   # mapa s tvojimi slikami
    output_folder = './faces'         # mapa za izrezane obraze

    process_folder(input_folder, output_folder)
