import httpx
r = httpx.get(
    "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson",
    params={
        "format": "geojson",
        "minlatitude": 8.0,
        "maxlatitude": 11.5,
        "minlongitude": -86.0,
        "maxlongitude": -82.0,
        "minmagnitude": 1,
        "orderby": "time",
        "limit": 5,
    },
    timeout=10,
)
d = r.json()
print(f"USGS HTTP: {len(d['features'])} events")
for f in d["features"]:
    p = f["properties"]
    print(f"  {p['mag']}M {p['place']}")
