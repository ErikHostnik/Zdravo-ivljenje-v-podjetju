import subprocess
import sys
import os
import io

# Nastavi default encoding na UTF-8 (za Windows terminal)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Absolutna pot do mape s skriptami
SCRIPT_DIR = os.path.dirname(__file__)

def run_script(script_name, folder_path):
    script_path = os.path.join(SCRIPT_DIR, script_name)
    result = subprocess.run(
        [sys.executable, script_path, folder_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        
    )
    if result.returncode != 0:
        print(f"Napaka pri {script_name}:\n{result.stderr}")
    else:
        print(result.stdout)

if __name__ == '__main__':

    input_folder = sys.argv[1]

    print("  1. Zaznavanje obrazov (face_data_collector.py)")
    run_script('face_data_collector.py', input_folder)

    preprocessed_folder = os.path.join(input_folder, 'preprocessed')
    print("  2. Predprocesiranje (preprocess_faces.py)")
    run_script('preprocess_faces.py', preprocessed_folder)

    print("  3. Augmentacija (augment_faces.py)")
    run_script('augment_faces.py', preprocessed_folder)

    print(" Celotna obdelava zaključena.")
