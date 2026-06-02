import httpx

r = httpx.get("http://localhost:8000/api/v1/earthquakes/history?per_page=5", timeout=5)
d = r.json()
print(f"{d['total']} sismos en DB")
for e in d["data"][:5]:
    print(f"  {e['magnitude']}M {e['location_description']} @ {e['occurred_at'][:19]}")
