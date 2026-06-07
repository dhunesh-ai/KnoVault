import bcrypt

# Test raw bcrypt
password = "my_super_secure_password"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print("Hashed:", hashed)

# Verify
is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
print("Is valid:", is_valid)
