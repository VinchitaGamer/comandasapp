import urllib.request
import urllib.parse
import urllib.error
import json
import ssl
import time
import os

ssl_context = ssl._create_unverified_context()
BASE_URL = "http://127.0.0.1:8000/api"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ssl_context) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            body = json.loads(body)
        except:
            pass
        return e.code, body
    except Exception as e:
        return 500, str(e)

def download_pdf(path, token, filename):
    url = f"{BASE_URL}{path}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, context=ssl_context) as response:
            content = response.read()
            with open(filename, "wb") as f:
                f.write(content)
            return response.status, len(content)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 500, str(e)

def print_header(title):
    print("\n" + "=" * 60)
    print(f" {title.upper()} ".center(60, "="))
    print("=" * 60)

def main():
    print_header("Herramienta de Simulación de Turno Completo")
    print("Esta herramienta automatizará el ciclo de vida completo de un turno:")
    print(" 1. Inicio de sesión (Mesero y Administrador)")
    print(" 2. Apertura de Caja (Arqueo Inicial)")
    print(" 3. Registro de Comandas de Prueba (Mesero)")
    print(" 4. Preparación y Despacho en Cocina (Cocina)")
    print(" 5. Pago y Entrega (Efectivo / Tarjeta / Pago Dividido)")
    print(" 6. Cierre de Caja y Generación de Reporte de Auditoría PDF")
    print("=" * 60)
    
    time.sleep(1.5)
    
    # STEP 1: LOGIN
    print("\n[1/7] Iniciando sesión en el sistema...")
    
    # Login Admin
    login_data = urllib.parse.urlencode({"username": "admin", "password": "admin123"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    try:
        with urllib.request.urlopen(req, context=ssl_context) as response:
            admin_token = json.loads(response.read().decode("utf-8"))["access_token"]
            print("  -> Sesión iniciada como ADMINISTRADOR [OK]")
    except Exception as e:
        print(f"  [ERROR] No se pudo iniciar sesión como admin. Asegúrese de que el servidor esté corriendo en {BASE_URL}. Detalle: {e}")
        return

    # Login Mesero
    login_data = urllib.parse.urlencode({"username": "mesero1", "password": "mesero123"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    try:
        with urllib.request.urlopen(req, context=ssl_context) as response:
            mesero_token = json.loads(response.read().decode("utf-8"))["access_token"]
            print("  -> Sesión iniciada como MESERO (mesero1) [OK]")
    except Exception as e:
        print(f"  [ERROR] No se pudo iniciar sesión como mesero: {e}")
        return

    time.sleep(1)

    # STEP 2: CHECK ACTIVE ARQUEO & OPEN
    print("\n[2/7] Gestionando Apertura de Caja (Arqueo)...")
    status, active_arqueo = make_request("/arqueo/activo", "GET", token=admin_token)
    
    if status == 200 and active_arqueo is not None:
        print(f"  -> Se detectó una caja abierta activa (ID: {active_arqueo['id']}).")
        print("  -> Cerrando caja abierta para iniciar una simulación limpia...")
        # Auto close it
        close_status, close_res = make_request("/arqueo/cierre", "POST", data={
            "actual_cash": active_arqueo["initial_cash"] + active_arqueo["estimated_cash"],
            "observations": "Cierre automático para iniciar simulación de turno limpia."
        }, token=admin_token)
        if close_status == 200:
            print("  -> Caja anterior cerrada con éxito.")
        else:
            print(f"  [ERROR] No se pudo cerrar la caja abierta: {close_res}")
            return
        time.sleep(1)

    # Open cash desk with S/. 150.00
    initial_cash = 150.00
    status, arqueo = make_request("/arqueo/apertura", "POST", data={"initial_cash": initial_cash}, token=admin_token)
    if status == 201:
        print(f"  -> ¡Caja Abierta con Éxito!")
        print(f"     ID de Arqueo: {arqueo['id']}")
        print(f"     Responsable: {arqueo['username']}")
        print(f"     Saldo Inicial: S/. {arqueo['initial_cash']:.2f}")
    else:
        print(f"  [ERROR] Falló la apertura de caja: {arqueo}")
        return

    time.sleep(1.5)

    # STEP 3: CREATING TEST COMMANDS (WAITER SIMULATION)
    print("\n[3/7] Creando comandas de prueba (Simulando Rol Mesero)...")
    
    # Order 1: Table 3 (1x Ceviche Carretillero with extra cancha, 2x Lomo Saltado)
    # Ceviche (ID 1) price = 16.50. Cancha Mod (ID 4) = 1.50. Total item = 18.00
    # Lomo Saltado (ID 2) price = 19.90. Total item = 19.90 * 2 = 39.80
    # Total Order 1 = 18.00 + 39.80 = 57.80
    order1_payload = {
        "table_number": 3,
        "items": [
            {
                "plate_id": 1,
                "quantity": 1,
                "comment": "Picante medio",
                "modifier_ids": [4] # extra cancha
            },
            {
                "plate_id": 2,
                "quantity": 2,
                "comment": "Término tres cuartos",
                "modifier_ids": []
            }
        ]
    }
    status1, o1 = make_request("/comandas", "POST", data=order1_payload, token=mesero_token)
    if status1 == 201:
        print(f"  -> Comanda 1 (Mesa {o1['table_number']}) Creada con éxito. Total: S/. {o1['total_price']:.2f} (Estado: {o1['status']})")
    else:
        print(f"  [ERROR] Falló la creación de comanda 1: {o1}")
        return
    order1_id = o1["id"]

    # Order 2: Table 8 (2x Tallarines a la Huancaína, 2x Pisco Sour)
    # Tallarines (ID 3) price = 22.00. Total item = 44.00
    # Pisco Sour (ID 4) price = 8.50. Total item = 17.00
    # Total Order 2 = 44.00 + 17.00 = 61.00
    order2_payload = {
        "table_number": 8,
        "items": [
            {
                "plate_id": 3,
                "quantity": 2,
                "comment": "Salsa extra",
                "modifier_ids": []
            },
            {
                "plate_id": 4,
                "quantity": 2,
                "comment": "Bien frío",
                "modifier_ids": []
            }
        ]
    }
    status2, o2 = make_request("/comandas", "POST", data=order2_payload, token=mesero_token)
    if status2 == 201:
        print(f"  -> Comanda 2 (Mesa {o2['table_number']}) Creada con éxito. Total: S/. {o2['total_price']:.2f} (Estado: {o2['status']})")
    else:
        print(f"  [ERROR] Falló la creación de comanda 2: {o2}")
        return
    order2_id = o2["id"]

    time.sleep(2)

    # STEP 4: KITCHEN WORKFLOW (SIMULATION)
    print("\n[4/7] Preparación y Despacho de Platos (Simulando Rol Cocina)...")
    
    # Process Order 1
    print(f"  -> Cocina acepta Comanda #{order1_id} (Mesa 3)")
    make_request(f"/comandas/{order1_id}?status_update=EN_PROCESO", "PATCH", token=admin_token)
    time.sleep(1)
    print(f"  -> Cocina termina Comanda #{order1_id} (Mesa 3) y la marca como LISTO PARA SERVIR")
    make_request(f"/comandas/{order1_id}?status_update=LISTO", "PATCH", token=admin_token)
    
    time.sleep(1.5)

    # Process Order 2
    print(f"  -> Cocina acepta Comanda #{order2_id} (Mesa 8)")
    make_request(f"/comandas/{order2_id}?status_update=EN_PROCESO", "PATCH", token=admin_token)
    time.sleep(1)
    print(f"  -> Cocina termina Comanda #{order2_id} (Mesa 8) y la marca como LISTO PARA SERVIR")
    make_request(f"/comandas/{order2_id}?status_update=LISTO", "PATCH", token=admin_token)

    time.sleep(2)

    # STEP 5: REGISTERS PAYMENTS AND MARKS DELIVERED (WAITER ROLE)
    print("\n[5/7] Procesando Pagos y Entrega (Simulando Rol Mesero)...")
    
    # Pay Order 1: Split Payment (Efectivo S/. 27.80, Tarjeta S/. 30.00)
    print(f"  -> Registrando Pago Dividido para Comanda #{order1_id} (Mesa 3, Total: S/. 57.80)...")
    pay_status1, p1 = make_request(f"/comandas/{order1_id}/pago", "PATCH", data={
        "payment_method": "DIVIDIDO",
        "payment_cash": 27.80,
        "payment_qr": 0.0,
        "payment_card": 30.00
    }, token=mesero_token)
    if pay_status1 == 200:
        print("     [OK] Pago registrado. Efectivo: S/. 27.80 | Tarjeta: S/. 30.00")
        # Mark delivered
        make_request(f"/comandas/{order1_id}?status_update=ENTREGADO", "PATCH", token=mesero_token)
        print("     [OK] Comanda marcada como ENTREGADA y archivada.")
    else:
        print(f"     [ERROR] Falló el pago de comanda 1: {p1}")
        return

    time.sleep(1.5)

    # Pay Order 2: Card Payment (Tarjeta S/. 61.00)
    print(f"  -> Registrando Pago con Tarjeta para Comanda #{order2_id} (Mesa 8, Total: S/. 61.00)...")
    pay_status2, p2 = make_request(f"/comandas/{order2_id}/pago", "PATCH", data={
        "payment_method": "TARJETA",
        "payment_cash": 0.0,
        "payment_qr": 0.0,
        "payment_card": 61.00
    }, token=mesero_token)
    if pay_status2 == 200:
        print("     [OK] Pago registrado. Tarjeta: S/. 61.00")
        # Mark delivered
        make_request(f"/comandas/{order2_id}?status_update=ENTREGADO", "PATCH", token=mesero_token)
        print("     [OK] Comanda marcada como ENTREGADA y archivada.")
    else:
        print(f"     [ERROR] Falló el pago de comanda 2: {p2}")
        return

    time.sleep(1.5)

    # STEP 6: VERIFY ACTIVE STATS IN REAL-TIME
    print("\n[6/7] Consultando estado consolidado de la caja abierta...")
    status, box_stats = make_request("/arqueo/activo", "GET", token=admin_token)
    if status == 200:
        print(f"  -> Ventas en efectivo estimadas: S/. {box_stats['estimated_cash']:.2f}")
        print(f"  -> Ventas por tarjeta/electrónico: S/. {box_stats['card_sales']:.2f}")
        expected_cash = initial_cash + box_stats['estimated_cash']
        print(f"  -> Total esperado en efectivo físico (inicial + ventas): S/. {expected_cash:.2f}")
    else:
        print(f"  [ERROR] No se pudo obtener estadísticas de caja: {box_stats}")
        return

    time.sleep(2)

    # STEP 7: CLOSE CAJA AND DOWNLOAD PDF
    print("\n[7/7] Realizando Cierre de Caja (Arqueo) y Auditoría...")
    
    # We report exactly what was expected: S/. 177.80
    actual_cash_reported = expected_cash
    status, close_res = make_request("/arqueo/cierre", "POST", data={
        "actual_cash": actual_cash_reported,
        "observations": "Turno simulado sin discrepancias de dinero físico. Simulación automática finalizada con éxito."
    }, token=admin_token)
    
    if status == 200:
        print("  -> ¡Caja cerrada exitosamente!")
        print("  -> Resumen de Cierre de Turno:")
        print("     " + "-" * 45)
        print(f"     Monto Inicial:              S/. {close_res['initial_cash']:.2f}")
        print(f"     Monto Estimado Efectivo:    S/. {close_res['estimated_cash']:.2f}")
        print(f"     Monto Reportado Físico:     S/. {close_res['actual_cash']:.2f}")
        print(f"     Monto Ventas Electrónicas:  S/. {close_res['card_sales']:.2f}")
        print(f"     Diferencia en Caja:         S/. {close_res['difference']:.2f}")
        print(f"     Observaciones:              {close_res['observations']}")
        print("     " + "-" * 45)
    else:
        print(f"  [ERROR] No se pudo cerrar la caja: {close_res}")
        return

    time.sleep(1)
    
    # Download PDF
    pdf_filename = "reporte_arqueo_simulado_turno.pdf"
    print(f"  -> Descargando reporte de auditoría formal en PDF...")
    pdf_status, pdf_len = download_pdf(f"/arqueo/{arqueo['id']}/pdf", admin_token, pdf_filename)
    if pdf_status == 200:
        print(f"  -> ¡Reporte Guardado Correctamente!")
        print(f"     Archivo: {os.path.abspath(pdf_filename)}")
        print(f"     Tamaño del PDF: {pdf_len} bytes")
    else:
        print(f"  [ERROR] Falló la descarga del PDF de auditoría: {pdf_len}")

    print("\n" + "=" * 60)
    print(" SIMULACIÓN DE TURNO COMPLETADA EXITOSAMENTE ".center(60, "="))
    print("=" * 60)

if __name__ == "__main__":
    main()
