import cv2
import os
import numpy as np

# Priprava podatkov
data_dir = 'data_faces'  # mapa z imeniki za vsako osebo, znotraj slike .jpg/.png
label_map = {}           # slovar: ime osebe -> številska oznaka
faces, labels = [], []
label_counter = 0