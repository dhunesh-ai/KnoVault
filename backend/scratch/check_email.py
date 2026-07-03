import os

log_path = "email_service.log"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    print(f"Total log lines: {len(lines)}")
    print("--- LAST 50 LOG LINES ---")
    for line in lines[-50:]:
        print(line.strip())
else:
    print("No log file found.")
