import serial
import time
import json

PORT = "COM6"
BAUD = 115200

def main():
    ser = serial.Serial(PORT, BAUD, timeout=0.2)
    time.sleep(0.5)

    print(f"Listening on {PORT} @ {BAUD}")
    buf = b""

    while True:
        chunk = ser.read(4096)
        if not chunk:
            continue

        buf += chunk

        while b"\n" in buf:
            line, buf = buf.split(b"\n", 1)
            line = line.strip(b"\r")

            if not line:
                continue

            text = line.decode("utf-8", errors="replace")

            if text.startswith("{") and text.endswith("}"):
                try:
                    obj = json.loads(text)
                    print(f"id={obj.get('id')} x={obj.get('x')} y={obj.get('y')} z={obj.get('z')}")
                except json.JSONDecodeError:
                    print(f" {text}")
            else:
                print(f"{text}")

if __name__ == "__main__":
    main()
