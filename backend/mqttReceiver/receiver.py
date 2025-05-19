import json
import os
import subprocess
from pymongo import MongoClient
from bson import ObjectId
import paho.mqtt.client as mqtt

MONGO_URI = "mongodb+srv://root:hojladrijadrom@zdravozivpodjetja.1hunr7p.mongodb.net/?retryWrites=true&w=majority&appName=ZdravoZivPodjetja"
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.zdravozivpodjetja
sensor_collection = db.sensordatas
user_collection = db.users 

BROKER_HOST = "127.0.0.1"
BROKER_PORT = 1883
TOPIC = "sensors/test"

def call_scraper(lat, lon):
    try:
        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'weather-scrapper.js')
        print("Using scraper path:", script_path)

        result = subprocess.run(
            ["node", script_path, str(lat), str(lon)],
            capture_output=True, text=True, check=True
        )
        print("Weather Scraper result:", result.stdout)

        if not result.stdout:
            print("Empty response from weather scraper")
            return None

        weather_data = json.loads(result.stdout)
        print("Weather data:", weather_data)
        return weather_data

    except subprocess.CalledProcessError as e:
        print("Scraper error:", e.stderr)
        return None
    except json.JSONDecodeError:
        print("Failed to decode weather data JSON")
        return None

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
        print("📨 Received:", payload)

        if "session" in payload:
            session_data = {
                "user": payload.get("userId"),
                "session": payload["session"]
            }

            if isinstance(payload["session"], list) and payload["session"]:
                last = payload["session"][-1]
                lat = last.get("latitude")
                lon = last.get("longitude")

                if lat and lon:
                    weather = call_scraper(lat, lon)
                    if weather:
                        session_data["weather"] = weather

            # Shrani SensorData v MongoDB
            result = sensor_collection.insert_one(session_data)
            sensor_data_id = result.inserted_id
            print(" Session data with weather saved to MongoDB")

            # Posodobi uporabnika (dodaj aktivnost v seznam)
            user_id = payload.get("userId")
            if user_id:
                update_result = user_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$push": {"activities": sensor_data_id}}
                )
                if update_result.modified_count > 0:
                    print(f"Aktivnost {sensor_data_id} dodana uporabniku {user_id}")
                else:
                    print(f" Uporabnik {user_id} ni posodobljen (morda ne obstaja?)")
            else:
                print("Ni userId podanega v sporočilu.")

        else:
            print("Ni session podatkov v MQTT sporočilu.")
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
