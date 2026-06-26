from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.plate import Plate, Modifier
from app.core.security import get_password_hash

def seed_db():
    # Make sure all tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if database has users already
        if db.query(User).count() > 0:
            print("Database already contains users. Skipping seed.")
            return

        print("Seeding database...")
        
        # 1. Create default users
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            role="ADMIN"
        )
        mesero = User(
            username="mesero1",
            password_hash=get_password_hash("mesero123"),
            role="MESERO"
        )
        cocina = User(
            username="cocina1",
            password_hash=get_password_hash("cocina123"),
            role="COCINA"
        )
        db.add_all([admin, mesero, cocina])
        db.flush()
        
        # 2. Create sample plates and modifiers
        # Plate 1: Ceviche Carretillero
        ceviche = Plate(
            name="Ceviche Carretillero",
            description="Ceviche clásico de pesca del día acompañado de chicharrón de calamar crujiente, camote dulce y choclo.",
            price=16.50,
            category="Entradas",
            is_visible=True
        )
        db.add(ceviche)
        db.flush()
        
        c_mod1 = Modifier(plate_id=ceviche.id, name="Sin picante", extra_price=0.0, is_available=True)
        c_mod2 = Modifier(plate_id=ceviche.id, name="Picante medio", extra_price=0.0, is_available=True)
        c_mod3 = Modifier(plate_id=ceviche.id, name="Picante extra", extra_price=0.0, is_available=True)
        c_mod4 = Modifier(plate_id=ceviche.id, name="Porción de cancha adicional", extra_price=1.50, is_available=True)
        db.add_all([c_mod1, c_mod2, c_mod3, c_mod4])
        
        # Plate 2: Lomo Saltado
        lomo = Plate(
            name="Lomo Saltado a la Criolla",
            description="Trozos de lomo fino saltados al wok con cebolla, tomate, ají amarillo y cebollita china. Servido con papas fritas y arroz blanco.",
            price=19.90,
            category="Fondos",
            is_visible=True
        )
        db.add(lomo)
        db.flush()
        
        l_mod1 = Modifier(plate_id=lomo.id, name="Término Jugoso", extra_price=0.0, is_available=True)
        l_mod2 = Modifier(plate_id=lomo.id, name="Término a Punto", extra_price=0.0, is_available=True)
        l_mod3 = Modifier(plate_id=lomo.id, name="Sin Arroz (Solo Papas)", extra_price=0.0, is_available=True)
        l_mod4 = Modifier(plate_id=lomo.id, name="Huevo frito montado", extra_price=1.00, is_available=True)
        db.add_all([l_mod1, l_mod2, l_mod3, l_mod4])
        
        # Plate 3: Tallarines a la Huancaína con Bife
        tallarines = Plate(
            name="Tallarines a la Huancaína con Bife",
            description="Pasta fetuccini en salsa cremosa a base de ají amarillo y queso fresco, coronada con un jugoso bife de res a la parrilla.",
            price=22.00,
            category="Fondos",
            is_visible=True
        )
        db.add(tallarines)
        db.flush()
        
        t_mod1 = Modifier(plate_id=tallarines.id, name="Término Bife: Jugoso", extra_price=0.0, is_available=True)
        t_mod2 = Modifier(plate_id=tallarines.id, name="Término Bife: Bien cocido", extra_price=0.0, is_available=True)
        t_mod3 = Modifier(plate_id=tallarines.id, name="Extra salsa huancaína", extra_price=2.00, is_available=True)
        db.add_all([t_mod1, t_mod2, t_mod3])
        
        # Plate 4: Pisco Sour Clásico
        pisco = Plate(
            name="Pisco Sour Clásico",
            description="Nuestra bebida bandera. Mezcla perfecta de pisco quebranta, limón norteño, jarabe de goma, clara de huevo y gotas de amargo de angostura.",
            price=8.50,
            category="Bebidas",
            is_visible=True
        )
        db.add(pisco)
        db.flush()
        
        p_mod1 = Modifier(plate_id=pisco.id, name="Con pisco acholado", extra_price=1.00, is_available=True)
        p_mod2 = Modifier(plate_id=pisco.id, name="Menos dulce", extra_price=0.0, is_available=True)
        db.add_all([p_mod1, p_mod2])
        
        # Plate 5: Chicha Morada Personal
        chicha = Plate(
            name="Chicha Morada Natural",
            description="Bebida refrescante elaborada a base de maíz morado hervido con piña, manzana, membrillo, canela y clavo de olor.",
            price=4.50,
            category="Bebidas",
            is_visible=True
        )
        db.add(chicha)
        db.flush()
        
        # Plate 6: Suspiro a la Limeña
        suspiro = Plate(
            name="Suspiro a la Limeña",
            description="Postre tradicional cremoso a base de manjar blanco de yemas, cubierto con un delicado merengue al oporto y canela.",
            price=6.00,
            category="Postres",
            is_visible=True
        )
        db.add(suspiro)
        db.flush()
        
        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
