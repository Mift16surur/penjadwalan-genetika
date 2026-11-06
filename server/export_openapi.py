import json
import os
from server.main import app

def export_docs():
    openapi_data = app.openapi()
    os.makedirs("server/docs", exist_ok=True)
    out_path = os.path.join("server", "docs", "openapi.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, indent=2)
    print(f"OpenAPI JSON exported to: {out_path}")
    print(f"Total documented endpoints: {len(openapi_data['paths'])}")
    for path, methods in openapi_data["paths"].items():
        m_list = [m.upper() for m in methods.keys()]
        print(f"  [{', '.join(m_list)}] {path}")

if __name__ == "__main__":
    export_docs()

