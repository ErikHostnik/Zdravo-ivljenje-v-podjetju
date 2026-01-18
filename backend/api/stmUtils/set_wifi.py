import socket

ESP_IP = "192.168.4.1"
ESP_PORT = 8080

SSID = "iPhone"
PASS = "pass1213"
SERVER_IP = "172.20.10.2"

def main():
    msg = f"SETWIFI:ssid={SSID};pass={PASS};ip={SERVER_IP}\r\n".encode()

    print("Connect to STM_32 Wifi")

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)

    try:
        s.connect((ESP_IP, ESP_PORT))
    except Exception as e:
        print("Connection failed:", e)
        return

    print("Sending config.")
    s.sendall(msg)

    try:
        resp = s.recv(128)
        print("Response:", resp.decode().strip())
    except:
        print("No response")

    s.close()

if __name__ == "__main__":
    main()
