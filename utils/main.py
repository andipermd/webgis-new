import psycopg2

# Koneksi ke database PostgreSQL
conn = psycopg2.connect(
    host="localhost",
    database="geodb",
    user="postgres",
    password="admin",
    port=5432
)

cursor = conn.cursor()

# Query untuk mendapatkan daftar tabel di database
cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
""")

# Ambil hasil query
tables = cursor.fetchall()

# Tampilkan daftar tabel
print("Daftar tabel di database 'geodb':")
for table in tables:
    print(f"- {table[0]}")

# Tutup koneksi
cursor.close()
conn.close()
