import sys; sys.path.insert(0,'.')
from core.database import get_supabase
from dotenv import load_dotenv; load_dotenv()
db = get_supabase()

all_items = []
offset = 0
while True:
    page = db.table("catalog_items").select("name,category,color,gender").range(offset, offset+999).execute()
    if not page.data: break
    all_items.extend(page.data)
    if len(page.data) < 1000: break
    offset += 1000

proper   = [i for i in all_items if "#" not in i.get("name","")]
improper = [i for i in all_items if "#"     in i.get("name","")]
print(f"Total: {len(all_items)}")
print(f"AI-classified: {len(proper)}")
print(f"Still random:  {len(improper)}")
print("\nSample AI-classified:")
for i in proper[:5]:
    print(f"  {i['name']} | {i['category']} | {i['color']} | {i['gender']}")
