import json
import os
import subprocess
from pymongo import MongoClient
from bson import ObjectId
import paho.mqtt.client as mqtt
from datetime import datetime, timedelta, timezone
from pymongo import UpdateOne
from math import radians, cos, sin, asin, sqrt

MONGO_URI = "mongodb+srv://root:hojladrijadrom@zdravozivpodjetja.1hunr7p.mongodb.net/?retryWrites=true&w=majority&appName=ZdravoZivPodjetja"
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.zdravozivpodjetja
sensor_collection = db.sensordatas
user_collection = db.users 

BROKER_HOST = "127.0.0.1"
BROKER_PORT = 1883
TOPIC = "sensors/test"



def calculate_total_steps_and_distance(session):
    total_steps = 0
    total_distance = 0.0

    prev_point = None
    for entry in session:
        total_steps += entry.get("steps", 0)

        lat = entry.get("latitude")
        lon = entry.get("longitude")

        if prev_point and lat is not None and lon is not None:
            # Haversine formula za razdaljo v km
            lon1, lat1, lon2, lat2 = map(radians, [prev_point["lon"], prev_point["lat"], lon, lat])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
            c = 2 * asin(sqrt(a))
            km = 6371 * c
            total_distance += km

        if lat is not None and lon is not None:
            prev_point = {"lat": lat, "lon": lon}

    return total_steps, total_distance

def update_daily_stats(user_id, steps, distance):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    user_collection.update_one(
        {"_id": user_id},
        {
            "$inc": {
                "stepCount": steps,
                "distance": distance
            }
        }
    )

    user = user_collection.find_one({"_id": user_id, "dailyStats.date": today})
    if user:
        user_collection.update_one(
            {"_id": user_id, "dailyStats.date": today},
            {
                "$inc": {
                    "dailyStats.$.stepCount": steps,
                    "dailyStats.$.distance": distance
                }
            }
        )
    else:
        user_collection.update_one(
            {"_id": user_id},
            {
                "$push": {
                    "dailyStats": {
                        "date": today,
                        "stepCount": steps,
                        "distance": distance
                    }
                }
            }
        )

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

                if lat is not None and lon is not None:
                    weather = call_scraper(lat, lon)
                    if weather:
                        session_data["weather"] = weather

            # Shrani SensorData v MongoDB
            result = sensor_collection.insert_one(session_data)
            sensor_data_id = result.inserted_id
            print("Session data with weather saved to MongoDB")

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
                    print(f"Uporabnik {user_id} ni posodobljen (morda ne obstaja?)")

                # Izračunaj in posodobi dnevne statistike
                steps, distance = calculate_total_steps_and_distance(payload["session"])
                update_daily_stats(ObjectId(user_id), steps, distance)
                print(f"✅ Posodobljen dailyStats za uporabnika {user_id}: koraki {steps}, razdalja {distance:.2f} km")

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
