import json
from pymongo import MongoClient
import paho.mqtt.client as mqtt

# MongoDB povezava
MONGO_URI = "mongodb+srv://root:hojladrijadrom@zdravozivpodjetja.1hunr7p.mongodb.net/?retryWrites=true&w=majority&appName=ZdravoZivPodjetja"
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.zdravozivpodjetja
sensor_collection = db.sensordatas

# MQTT nastavitve
BROKER_HOST = "test.mosquitto.org"
BROKER_PORT = 1883
TOPIC = "sensors/test"  

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT broker")
        client.subscribe(TOPIC)
        print(f"Subscribed to topic '{TOPIC}'")
    else:
        print("Connection failed with code:", rc)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print("Received:", payload)
        
        if "session" in payload:
            sensor_collection.insert_one({
                "user": payload.get("userId"),
                "session": payload["session"]
            })
            print("Session data saved to MongoDB")
        else:
            print("No session data found.")
    except Exception as e:
        print("Error:", e)

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    print("Connecting to MQTT broker…")
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_forever()

if __name__ == "__main__":
    main()
