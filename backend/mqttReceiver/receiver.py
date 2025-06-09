import json
import os
import subprocess
import threading
import time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId
import paho.mqtt.client as mqtt

from math import radians, cos, sin, asin, sqrt
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
BROKER_HOST = os.getenv("BROKER_HOST")
BROKER_PORT = int(os.getenv("BROKER_PORT"))
TOPIC = os.getenv("TOPIC")
TWO_FA_TOPIC_PREFIX = os.getenv("TWO_FA_TOPIC_PREFIX")

HEARTBEAT_TOPIC_PREFIX = os.getenv("HEARTBEAT_TOPIC_PREFIX", "status/heartbeat/")

HEARTBEAT_TIMEOUT_SECONDS = int(os.getenv("HEARTBEAT_TIMEOUT_SECONDS", "90"))

mongo_client = MongoClient(MONGO_URI)
db = mongo_client.zdravozivpodjetja
sensor_collection = db.sensordatas
user_collection = db.users

active_users = {}
active_users_lock = threading.Lock()


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

def calculate_speed_stats(session):
    speeds = [entry.get("speed") for entry in session if "speed" in entry and entry["speed"] is not None]
    if not speeds:
        return None, None, None  # Če ni podatkov o hitrosti

    avg_speed = sum(speeds) / len(speeds)
    min_speed = min(speeds)
    max_speed = max(speeds)

    return avg_speed, min_speed, max_speed

def calculate_total_ascent(session):
    total_ascent = 0.0
    prev_altitude = None

    for entry in session:
        altitude = entry.get("altitude")
        if altitude is None:
            continue

        if prev_altitude is not None:
            diff = altitude - prev_altitude
            if diff > 0:
                total_ascent += diff

        prev_altitude = altitude

    return total_ascent

def update_daily_stats(user_id, steps, distance, avg_speed, min_speed, max_speed, total_ascent):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Najprej posodobi skupni seštevek uporabnika
    user_collection.update_one(
        {"_id": user_id},
        {"$inc": {"stepCount": steps, "distance": distance}}
    )

    # Preveri, če že obstaja dnevni vnos za danes
    user = user_collection.find_one({"_id": user_id, "dailyStats.date": today}, {"dailyStats.$": 1})

    if user and "dailyStats" in user:
        # Če obstaja, povečaj korake in razdaljo
        existing = user["dailyStats"][0]
        updated_data = {
            "stepCount": existing.get("stepCount", 0) + steps,
            "distance": existing.get("distance", 0.0) + distance,
            "avgSpeed": avg_speed,
            "minSpeed": min_speed,
            "maxSpeed": max_speed,
            "altitudeDistance": total_ascent,
            "date": today
        }

        user_collection.update_one(
            {"_id": user_id, "dailyStats.date": today},
            {"$set": {"dailyStats.$": updated_data}}
        )
    else:
        # Če ne obstaja, dodaj nov vnos
        daily_data = {
            "date": today,
            "stepCount": steps,
            "distance": distance,
            "avgSpeed": avg_speed,
            "minSpeed": min_speed,
            "maxSpeed": max_speed,
            "altitudeDistance": total_ascent
        }

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


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("Povezan na MQTT broker")
        client.subscribe(TOPIC)
        client.subscribe(f"{TWO_FA_TOPIC_PREFIX}#")
        client.subscribe(f"{HEARTBEAT_TOPIC_PREFIX}#")
    else:
        print(f" Napaka pri povezavi: Koda {rc}")


def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload_raw = msg.payload.decode()
        if topic.startswith(HEARTBEAT_TOPIC_PREFIX):
            user_id = topic[len(HEARTBEAT_TOPIC_PREFIX):]
            try:
                data = json.loads(payload_raw)
                ts_str = data.get("timestamp")
                if ts_str:
                    last_hbt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                else:
                    last_hbt = datetime.now(timezone.utc)
            except Exception:
                last_hbt = datetime.now(timezone.utc)

            with active_users_lock:
                active_users[user_id] = last_hbt
            print(f"[HEARTBEAT] Prejet od {user_id}, čas: {last_hbt.isoformat()}")
            return

        if topic.startswith(TWO_FA_TOPIC_PREFIX):
            user_id = topic[len(TWO_FA_TOPIC_PREFIX):]
            payload = json.loads(payload_raw)
            confirmed = payload.get("confirmed")

            if confirmed is True:
                print(f"2FA potrjena za uporabnika: {user_id}")
            elif confirmed is False:
                print(f"2FA zavrnjena za uporabnika: {user_id}")
            else:
                print(" Neveljavno 2FA sporočilo (manjka 'confirmed')")
            return

        payload = json.loads(payload_raw)
        print(f" Prejeto ({topic}): {payload}")

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
            avg_speed, min_speed, max_speed = calculate_speed_stats(session)
            total_ascent = calculate_total_ascent(session)

            update_daily_stats(
                ObjectId(user_id),
                steps,
                distance,
                avg_speed,
                min_speed,
                max_speed,
                total_ascent
            )

            print(f"Statistika posodobljena – Koraki: {steps}, Razdalja: {distance:.2f} km, "
                  f"Povp. hitrost: {avg_speed}, Min: {min_speed}, Max: {max_speed}, Vzpon: {total_ascent} m")

            user_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"activities": result.inserted_id}}
            )

    except Exception as e:
        print(f"Kritična napaka: {str(e)}")


def remove_inactive_users():
    """
    Pregled vsakega userId-ja iz active_users in odstrani tiste,
    katerih zadnji heartbeat je starejši od HEARTBEAT_TIMEOUT_SECONDS.
    """
    now = datetime.now(timezone.utc)
    to_remove = []

    with active_users_lock:
        for user_id, last_time in active_users.items():
            if now - last_time > timedelta(seconds=HEARTBEAT_TIMEOUT_SECONDS):
                to_remove.append(user_id)

        for user_id in to_remove:
            print(f"[HEARTBEAT] Odstranjujem neaktivnega uporabnika: {user_id}")
            del active_users[user_id]


def monitor_active_users():
    """
    Aal background-thread, ki vsakih 30s pokliče remove_inactive_users
    in izpiše trenutno število aktivnih uporabnikov.
    """
    while True:
        time.sleep(60)
        remove_inactive_users()
        with active_users_lock:
            trenutni = list(active_users.keys())
        print(f"[HEARTBEAT] Trenutno aktivni uporabniki ({len(trenutni)}): {trenutni}")


def main():
    if not MONGO_URI:
        print("Error: MONGO_URI ni nastavljen.")
        exit(1)

    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    print(" Povezujem se na MQTT broker...")
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)

    monitor_thread = threading.Thread(target=monitor_active_users, daemon=True)
    monitor_thread.start()

    client.loop_forever()


if __name__ == "__main__":
    main()
