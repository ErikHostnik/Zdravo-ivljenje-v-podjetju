import cv2 as cv
import os
import sys

def extract_and_save_face(image_path, output_folder, size=(224, 224)):
    face_cascade = cv.CascadeClassifier(cv.data.haarcascades + 'haarcascade_frontalface_default.xml')

    image = cv.imread(image_path)
    if image is None:
        print(f"Napaka: ne morem odpreti {image_path}")
        return False

    gray = cv.cvtColor(image, cv.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

    if len(faces) == 0:
        print(f"Obraz ni zaznan v {image_path}")
        return False

    # Uporabi prvo zaznano območje obraza
    x, y, w, h = faces[0]
    face = image[y:y+h, x:x+w]
    face = cv.resize(face, size)

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
    if len(sys.argv) < 2:
        print("Uporaba: python face_data_collector.py <input_folder>")
        sys.exit(1)

    input_folder = sys.argv[1]
    output_folder = os.path.join('data_preprocessed', os.path.basename(input_folder))
    process_folder(input_folder, output_folder)
