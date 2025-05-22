import cv2 as cv
import numpy as np
import os
import random

input_folder = r'data_preprocessed'  # Izhod iz prejšnje skripte
output_folder = r'data_augmented'
os.makedirs(output_folder, exist_ok=True)

def rotate_image(image, angle):
    """Zasuk slike za dani kot."""
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv.warpAffine(image, matrix, (w, h), borderMode=cv.BORDER_REFLECT)
    return rotated

def flip_horizontal(image):
    """Ogledalo (horizontal flip)."""
    return cv.flip(image, 1)


