import pymysql

conn = pymysql.connect(host='localhost', user='root', password='')
cur = conn.cursor()
cur.execute("CREATE USER IF NOT EXISTS 'erp_user'@'localhost' IDENTIFIED BY 'erp_secure_password'")
cur.execute("ALTER USER 'erp_user'@'localhost' IDENTIFIED BY 'erp_secure_password'")
cur.execute("GRANT ALL PRIVILEGES ON *.* TO 'erp_user'@'localhost' WITH GRANT OPTION")
cur.execute("CREATE DATABASE IF NOT EXISTS ERPRealEstate")
cur.execute("CREATE DATABASE IF NOT EXISTS erp_realestate_db")
cur.execute("FLUSH PRIVILEGES")
print("[DB SUCCESS] erp_user configured with all privileges on MySQL!")
