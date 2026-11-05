import sqlite3
import json
import os
import sys

def export_transit_data(sqlite_path: str, output_path: str):
    print(f"Connecting to {sqlite_path}...")
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Fetch Stations
    # Schema: StationCode, StationName, Longitude, Latitude, Address
    print("Reading Stations...")
    cursor.execute("SELECT StationCode, StationName, Longitude, Latitude, Address FROM Stations")
    stations = {}
    for row in cursor.fetchall():
        code_str = str(row["StationCode"])
        name = (row["StationName"] or "").strip()
        lon = round(float(row["Longitude"]), 5)
        lat = round(float(row["Latitude"]), 5)
        addr = (row["Address"] or "").strip()
        # [name, lon, lat, address]
        stations[code_str] = [name, lon, lat, addr]

    print(f"Processed {len(stations)} stations.")

    # 2. Fetch Routes
    # Schema: RouteID, RouteCode, Direction, RouteType, OriginationName, DestinationName, Vertices
    print("Reading Routes...")
    cursor.execute("SELECT RouteID, RouteCode, Direction, RouteType, OriginationName, DestinationName, Vertices FROM Routes")
    routes = {}
    route_code_map = {} # route_id -> route_code (for sorting stationRoutes)
    for row in cursor.fetchall():
        r_id = int(row["RouteID"])
        r_code = int(row["RouteCode"])
        route_code_map[r_id] = r_code

        raw_dir = str(row["Direction"] or "").strip()
        norm_dir = str(ord(raw_dir)) if len(raw_dir) == 1 and not raw_dir.isdigit() else raw_dir

        orig = (row["OriginationName"] or "").strip()
        dest = (row["DestinationName"] or "").strip()

        # Parse Vertices: "lon,lat;lon,lat;..."
        raw_vertices = (row["Vertices"] or "").strip()
        path = []
        if raw_vertices:
            for pair in raw_vertices.split(";"):
                pair = pair.strip()
                if not pair:
                    continue
                parts = pair.split(",")
                if len(parts) >= 2:
                    try:
                        v_lon = round(float(parts[0]), 5)
                        v_lat = round(float(parts[1]), 5)
                        path.append([v_lon, v_lat])
                    except ValueError:
                        continue

        routes[str(r_id)] = {
            "id": r_id,
            "code": r_code,
            "dir": norm_dir,
            "orig": orig,
            "dest": dest,
            "path": path
        }

    print(f"Processed {len(routes)} routes.")

    # 3. Fetch RouteStations
    # Schema: RouteID, StationCode, StationOrder, IsLastStation
    print("Reading RouteStations...")
    cursor.execute("SELECT RouteID, StationCode, StationOrder, IsLastStation FROM RouteStations ORDER BY RouteID, StationOrder ASC")
    
    station_routes = {} # station_code_str -> list of route_id
    route_stations = {} # route_id_str -> list of station_code

    for row in cursor.fetchall():
        r_id = int(row["RouteID"])
        s_code = int(row["StationCode"])
        s_code_str = str(s_code)
        r_id_str = str(r_id)

        if s_code_str not in station_routes:
            station_routes[s_code_str] = []
        if r_id not in station_routes[s_code_str]:
            station_routes[s_code_str].append(r_id)

        if r_id_str not in route_stations:
            route_stations[r_id_str] = []
        if s_code not in route_stations[r_id_str]:
            route_stations[r_id_str].append(s_code)

    # Sort stationRoutes route IDs by RouteCode ascending
    for s_code_str, r_ids in station_routes.items():
        r_ids.sort(key=lambda rid: (route_code_map.get(rid, 999999), rid))

    print(f"Processed {len(station_routes)} station mappings and {len(route_stations)} route station sequences.")

    transit_data = {
        "stations": stations,
        "routes": routes,
        "stationRoutes": station_routes,
        "routeStations": route_stations
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    print(f"Writing JSON output to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(transit_data, f, ensure_ascii=False, separators=(',', ':'))

    size_bytes = os.path.getsize(output_path)
    size_mb = size_bytes / (1024 * 1024)
    print(f"Successfully exported transit data: {size_mb:.2f} MB ({size_bytes:,} bytes).")

if __name__ == "__main__":
    db_path = "/home/user/Documents/etc/tmp/debug-tehran-app/tehran_transit.sqlite"
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    out_path = "/home/user/Documents/etc/tmp/debug-tehran-app/TehranStations/public/data/transit-data.json"
    if len(sys.argv) > 2:
        out_path = sys.argv[2]
        
    export_transit_data(db_path, out_path)

