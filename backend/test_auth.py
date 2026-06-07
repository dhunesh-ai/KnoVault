import requests

url = "http://127.0.0.1:8000/api/auth/login"
data = {
    "email": "test@knovault.app",
    "password": "password123"
}
response = requests.post(url, json=data)
print(response.status_code)
print(response.json())
