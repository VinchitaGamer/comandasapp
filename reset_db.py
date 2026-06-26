import os
import sys

# Get absolute path of backend directory relative to the script/executable
if getattr(sys, 'frozen', False):
    # Running as compiled .exe, get the directory where the .exe is placed
    base_dir = os.path.dirname(sys.executable)
else:
    # Running as raw script
    base_dir = os.path.dirname(os.path.abspath(__file__))

backend_dir = os.path.abspath(os.path.join(base_dir, "backend"))
# Force DATABASE_URL to use the absolute path to backend/database.db
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(backend_dir, 'database.db')}"

# Add backend directory to Python path
sys.path.append(backend_dir)

from app.database import Base, engine
from app.core.seed import seed_db

def main():
    print("=" * 60)
    print(" RESTABLECIENDO BASE DE DATOS ".center(60, "="))
    print("=" * 60)
    
    try:
        # 1. Drop all tables
        print("\n[1/3] Eliminando todas las tablas de la base de datos...")
        Base.metadata.drop_all(bind=engine)
        print("      -> Tablas eliminadas [OK]")
        
        # 2. Recreate all tables
        print("\n[2/3] Creando estructura de tablas limpia...")
        Base.metadata.create_all(bind=engine)
        print("      -> Estructura de tablas creada [OK]")
        
        # 3. Seed initial data (users and plates)
        print("\n[3/3] Insertando datos semilla (usuarios y menú inicial)...")
        seed_db()
        print("      -> Datos semilla insertados [OK]")
        
        print("\n" + "=" * 60)
        print(" ¡BASE DE DATOS REINICIADA CON ÉXITO! ".center(60, "="))
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] Ocurrió un error al reiniciar la base de datos: {e}")
        print("Sugerencia: Si el archivo de la base de datos está bloqueado por el servidor uvicorn,")
        print("intente detener el servidor antes de ejecutar este script.")
        print("=" * 60)

    # In compiled .exe mode, we keep the terminal window open so the user can see the result
    if getattr(sys, 'frozen', False):
        input("\nPresione Enter para salir...")

if __name__ == "__main__":
    main()
