"""تست سریع موتور استنتاج بدون نیاز به سرور"""
import requests

# تست با فایل نمونه
url = "http://localhost:8000/infer?rpm=1500&fs=12800"
files = {"file": open("../../datasets/fixtures/sample_bearing_outer.csv","rb")}
try:
    r = requests.post(url, files=files)
    print(r.json())
except Exception as e:
    print(f"Server not running? {e}")
    print("Run: python api/server.py")
    # fallback: import logic directly
    import sys
    sys.path.append("api")
    print("Try direct infer instead")
