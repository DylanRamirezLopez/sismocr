import sys, json
d = json.load(sys.stdin)
if isinstance(d, dict) and "data" in d:
    items = d["data"]
else:
    items = d if isinstance(d, list) else []
print(f"{len(items)} sismos en DB")
for e in items[:3]:
    mag = e.get("magnitude", "?")
    loc = e.get("location_description", "?")
    print(f"  {mag}M {loc}")
