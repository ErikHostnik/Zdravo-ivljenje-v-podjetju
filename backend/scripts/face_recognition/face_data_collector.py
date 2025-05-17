import cv2 as cv
import os
from mtcnn import MTCNN

#Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process


def find_face(image, size=(224, 224)):
    detector = MTCNN()
    image_rgb = cv.cvtColor(image, cv.COLOR_BGR2RGB)
    results = detector.detect_faces(image_rgb)
    
    if len(results) == 0:
        return None  # ni obraza

    x1, y1, width, height = results[0]['box']
    x2, y2 = x1 + width, y1 + height

    # Preveri meje slike
    h, w, _ = image.shape
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    face = image[y1:y2, x1:x2]
    face = cv.resize(face, size)
    return face

def main():
    folder = r'C:\Users\erikh\OneDrive\Namizje\Projetk_ZDRAV\Zdravo-ivljenje-v-podjetju\backend\scripts\face_recognition\data'
    os.makedirs(folder, exist_ok=True)

    cap = cv.VideoCapture(0)
    if not cap.isOpened():
        print("Cannot open camera")
        exit()

    count = 0
    max_images = 10

    print("Pritisni q za prekinitev .")

    while count < max_images:
        ret, frame = cap.read()
        if not ret:
            print("ne moremo odpret kameree")
            break

        face = find_face(frame)
        if face is not None:
            count += 1
            cv.imshow('Zajeti obraz', face)
            cv.imwrite(os.path.join(folder, f'{count}.jpeg'), face)
            print(f"Zajeta slika {count}")
        else:
            cv.imshow('Zajeti obraz', frame)  # prikaže celoten frame, če ni obraza

        if cv.waitKey(1) & 0xFF == ord('q'):
            break

    print(f"Končano zajemanje {count} slik.")
    cap.release()
    cv.destroyAllWindows()

if __name__ == '__main__':
    main()
