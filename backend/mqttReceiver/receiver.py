import json
import os
import subprocess
from pymongo import MongoClient
from bson import ObjectId
import paho.mqtt.client as mqtt
from datetime import datetime, timezone
from math import radians, cos, sin, asin, sqrt

MONGO_URI = "mongodb+srv://root:hojladrijadrom@zdravozivpodjetja.1hunr7p.mongodb.net/?retryWrites=true&w=majority&appName=ZdravoZivPodjetja"
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.zdravozivpodjetja
sensor_collection = db.sensordatas
user_collection = db.users

BROKER_HOST = "127.0.0.1"
BROKER_PORT = 1883
TOPIC = "sensors/test"
TWO_FA_TOPIC_PREFIX = "2fa/confirm/"  # 2FA tema

def calculate_total_steps_and_distance(session):
    total_steps = 0
    total_distance = 0.0
    prev_point = None

    for entry in session:
        total_steps += entry.get("steps", 0)

        lat = entry.get("latitude")
        lon = entry.get("longitude")
        if prev_point and lat is not None and lon is not None:
            lon1, lat1, lon2, lat2 = map(radians, [prev_point["lon"], prev_point["lat"], lon, lat])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
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
        {"$inc": {"stepCount": steps, "distance": distance}}
    )

    daily_data = {
        "date": today,
        "stepCount": steps,
        "distance": distance
    }

    result = user_collection.update_one(
        {"_id": user_id, "dailyStats.date": today},
        {"$set": {"dailyStats.$": daily_data}}
    )

    if result.modified_count == 0:
        user_collection.update_one(
            {"_id": user_id},
            {"$push": {"dailyStats": daily_data}}
        )

def call_scraper(lat, lon):
    try:
        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'weather-scrapper.js')
        result = subprocess.run(
            ["node", script_path, str(lat), str(lon)],
            capture_output=True, text=True, check=True
        )

        if not result.stdout:
            return None

        return json.loads(result.stdout)
    except Exception as e:
        print(f"Weather scraper error: {str(e)}")
        return None

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Povezan na MQTT broker")
        client.subscribe(TOPIC)
        client.subscribe(f"{TWO_FA_TOPIC_PREFIX}#")  # Poslušaj vsa 2FA sporočila
    else:
        print(f" Napaka pri povezavi: Koda {rc}")

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode())
        print(f" Prejeto ({topic}): {payload}")

        if topic.startswith(TWO_FA_TOPIC_PREFIX):
            user_id = topic[len(TWO_FA_TOPIC_PREFIX):]
            confirmed = payload.get("confirmed")

            if confirmed is True:
                print(f"2FA potrjena za uporabnika: {user_id}")
            elif confirmed is False:
                print(f"2FA zavrnjena za uporabnika: {user_id}")
            else:
                print(" Neveljavno 2FA sporočilo (manjka 'confirmed')")
            return  

        if "session" not in payload or not isinstance(payload["session"], list):
            print("Neveljavna oblika podatkov")
            return

        session = payload["session"]
        user_id = payload.get("userId")

        session_data = {
            "user": user_id,
            "session": session,
        }

        if session:
            last_point = session[-1]
            weather = call_scraper(last_point.get("latitude"), last_point.get("longitude"))
            if weather:
                session_data["weather"] = weather

        result = sensor_collection.insert_one(session_data)
        print(f"Podatki shranjeni pod ID: {result.inserted_id}")

        if user_id:
            steps, distance = calculate_total_steps_and_distance(session)
            update_daily_stats(ObjectId(user_id), steps, distance)
            print(f"Statistika posodobljena - Koraki: {steps}, Razdalja: {distance:.2f} km")

            user_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"activities": result.inserted_id}}
            )

    except Exception as e:
        print(f"Kritična napaka: {str(e)}")

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    print(" Povezujem se na MQTT broker...")
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_forever()

if __name__ == "__main__":
    main()
