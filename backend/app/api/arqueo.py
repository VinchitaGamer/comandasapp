import datetime
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.arqueo import Arqueo
from app.models.order import Order
from app.schemas.arqueo import ArqueoCreate, ArqueoClose, ArqueoResponse
from app.core.security import RoleChecker

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/arqueo", tags=["Cash Desk Audit (Arqueo)"])

# Permissions
is_admin = RoleChecker(allowed_roles=["ADMIN"])
any_role = RoleChecker(allowed_roles=["MESERO", "COCINA", "ADMIN"])

def compute_arqueo_totals(arqueo_id: int, db: Session):
    """Calculate the cash and digital sales for a given arqueo by summing all delivered orders."""
    # Find all orders linked to this arqueo that are completed (status: ENTREGADO)
    orders = db.query(Order).filter(Order.arqueo_id == arqueo_id, Order.status == "ENTREGADO").all()
    
    # Calculate price for each order inside Python, as total_price is a computed field in format_order helper.
    # To compute total price accurately:
    # total = sum(detail.quantity * (detail.plate.price + sum(modifier.extra_price)))
    estimated_cash = 0.0
    card_sales = 0.0
    
    for order in orders:
        total_price = 0.0
        for detail in order.details:
            detail_total = detail.plate.price
            for odm in detail.modifiers:
                detail_total += odm.modifier.extra_price
            total_price += detail_total * detail.quantity
        
        # Distribute based on payment method details
        estimated_cash += order.payment_cash
        card_sales += (order.payment_card + order.payment_qr)
        
    return round(estimated_cash, 2), round(card_sales, 2)

def generate_arqueo_pdf(arqueo: Arqueo, db: Session) -> io.BytesIO:
    """Generate a formal PDF report for a closed arqueo session."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=40, 
        leftMargin=40, 
        topMargin=40, 
        bottomMargin=40
    )
    story = []
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=15,
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#475569'),
        spaceBefore=10,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )
    
    bold_style = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    # Document Title
    story.append(Paragraph("REPORTE OFICIAL DE ARQUEO DE CAJA", title_style))
    story.append(Spacer(1, 10))
    
    # Meta Data Table
    story.append(Paragraph(f"<b>ID de Arqueo:</b> #{arqueo.id}", body_style))
    story.append(Paragraph(f"<b>Cajero Responsable:</b> {arqueo.user.username}", body_style))
    story.append(Paragraph(f"<b>Estado de Caja:</b> {arqueo.status}", body_style))
    story.append(Paragraph(f"<b>Fecha de Apertura:</b> {arqueo.opened_at.strftime('%d/%m/%Y %H:%M:%S')}", body_style))
    if arqueo.closed_at:
        story.append(Paragraph(f"<b>Fecha de Cierre:</b> {arqueo.closed_at.strftime('%d/%m/%Y %H:%M:%S')}", body_style))
    story.append(Spacer(1, 15))
    
    # Summary of Cash Desk Flow
    story.append(Paragraph("Resumen de Balance Financiero", subtitle_style))
    
    expected_cash = arqueo.initial_cash + arqueo.estimated_cash
    
    summary_data = [
        [Paragraph("<b>Concepto</b>", bold_style), Paragraph("<b>Monto (S/.)</b>", bold_style)],
        [Paragraph("Monto Inicial de Caja (Apertura)", body_style), Paragraph(f"S/. {arqueo.initial_cash:.2f}", body_style)],
        [Paragraph("Ventas Registradas en Efectivo", body_style), Paragraph(f"S/. {arqueo.estimated_cash:.2f}", body_style)],
        [Paragraph("<b>Total Efectivo Esperado</b>", bold_style), Paragraph(f"<b>S/. {expected_cash:.2f}</b>", bold_style)],
        [Paragraph("Efectivo Físico Contado (Cierre)", body_style), Paragraph(f"S/. {arqueo.actual_cash:.2f}", body_style)],
        [Paragraph("<b>Descuadre / Diferencia</b>", bold_style), 
         Paragraph(f"<font color='{'red' if arqueo.difference < 0 else 'green'}'><b>S/. {arqueo.difference:.2f}</b></font>", bold_style)],
        [Paragraph("Ventas Totales Electrónicas (Tarjeta/QR)", body_style), Paragraph(f"S/. {arqueo.card_sales:.2f}", body_style)],
    ]
    
    t = Table(summary_data, colWidths=[300, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,3), (-1,3), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0,5), (-1,5), colors.HexColor('#FEF3C7')),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Detailed Orders List
    story.append(Paragraph("Historial de Comandas Cobradas", subtitle_style))
    orders = db.query(Order).filter(Order.arqueo_id == arqueo.id, Order.status == "ENTREGADO").all()
    
    if len(orders) == 0:
        story.append(Paragraph("No se registraron transacciones cobradas durante este turno.", body_style))
    else:
        order_headers = [
            Paragraph("<b>ID</b>", bold_style),
            Paragraph("<b>Mesa</b>", bold_style),
            Paragraph("<b>Hora Cobro</b>", bold_style),
            Paragraph("<b>Método Pago</b>", bold_style),
            Paragraph("<b>Total Comanda</b>", bold_style)
        ]
        order_rows = [order_headers]
        for o in orders:
            # calculate order total
            total_price = 0.0
            for d in o.details:
                detail_total = d.plate.price + sum(m.modifier.extra_price for m in d.modifiers)
                total_price += detail_total * d.quantity
                
            order_rows.append([
                Paragraph(f"#{o.id}", body_style),
                Paragraph(f"Mesa {o.table_number}", body_style),
                Paragraph(o.updated_at.strftime('%H:%M:%S'), body_style),
                Paragraph(o.payment_method or "N/A", body_style),
                Paragraph(f"S/. {total_price:.2f}", body_style)
            ])
            
        ot = Table(order_rows, colWidths=[65, 65, 110, 100, 110])
        ot.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(ot)
        
    story.append(Spacer(1, 20))
    
    # Observations Section
    story.append(Paragraph("Observaciones del Turno", subtitle_style))
    obs_text = arqueo.observations if arqueo.observations else "No se registraron observaciones."
    story.append(Paragraph(obs_text, body_style))
    
    story.append(Spacer(1, 50))
    
    # Signatures layout
    sig_data = [
        ["", ""],
        ["----------------------------------------", "----------------------------------------"],
        ["Firma del Cajero Responsable", "Firma del Supervisor / Admin"]
    ]
    st = Table(sig_data, colWidths=[225, 225])
    st.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#94A3B8')),
        ('FONTNAME', (0,2), (-1,2), 'Helvetica-Oblique'),
        ('FONTSIZE', (0,2), (-1,2), 9),
    ]))
    story.append(st)
    
    doc.build(story)
    buffer.seek(0)
    return buffer

@router.post("/apertura", response_model=ArqueoResponse, status_code=status.HTTP_201_CREATED)
def open_arqueo(
    apertura_in: ArqueoCreate, 
    db: Session = Depends(get_db), 
    user_payload: dict = Depends(is_admin)
):
    """Open a new arqueo session if none is currently active."""
    # Check if there is already an open arqueo
    existing_active = db.query(Arqueo).filter(Arqueo.status == "ABIERTO").first()
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Ya existe una sesión de arqueo activa. Debe cerrarla primero."
        )
        
    new_arqueo = Arqueo(
        user_id=user_payload.get("id"),
        initial_cash=apertura_in.initial_cash,
        status="ABIERTO"
    )
    
    db.add(new_arqueo)
    db.commit()
    db.refresh(new_arqueo)
    
    # For schema compatibility, we format response with username
    return {
        "id": new_arqueo.id,
        "user_id": new_arqueo.user_id,
        "username": user_payload.get("username", "admin"),
        "opened_at": new_arqueo.opened_at,
        "closed_at": new_arqueo.closed_at,
        "status": new_arqueo.status,
        "initial_cash": new_arqueo.initial_cash,
        "estimated_cash": new_arqueo.estimated_cash,
        "actual_cash": new_arqueo.actual_cash,
        "card_sales": new_arqueo.card_sales,
        "difference": new_arqueo.difference,
        "observations": new_arqueo.observations
    }

@router.get("/activo", response_model=Optional[ArqueoResponse])
def get_active_arqueo(db: Session = Depends(get_db), user_payload: dict = Depends(any_role)):
    """Fetch the active arqueo and calculate real-time estimated sales figures."""
    arqueo = db.query(Arqueo).filter(Arqueo.status == "ABIERTO").first()
    if not arqueo:
        return None
        
    estimated_cash, card_sales = compute_arqueo_totals(arqueo.id, db)
    
    return {
        "id": arqueo.id,
        "user_id": arqueo.user_id,
        "username": arqueo.user.username,
        "opened_at": arqueo.opened_at,
        "closed_at": arqueo.closed_at,
        "status": arqueo.status,
        "initial_cash": arqueo.initial_cash,
        "estimated_cash": estimated_cash,
        "actual_cash": arqueo.actual_cash,
        "card_sales": card_sales,
        "difference": arqueo.difference,
        "observations": arqueo.observations
    }

@router.post("/cierre", response_model=ArqueoResponse)
def close_arqueo(
    close_in: ArqueoClose, 
    db: Session = Depends(get_db), 
    user_payload: dict = Depends(is_admin)
):
    """Close the active arqueo session, record actual cash, discrepancy, and status."""
    arqueo = db.query(Arqueo).filter(Arqueo.status == "ABIERTO").first()
    if not arqueo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No hay una sesión de arqueo activa actualmente para cerrar."
        )
        
    estimated_cash, card_sales = compute_arqueo_totals(arqueo.id, db)
    
    arqueo.status = "CERRADO"
    arqueo.closed_at = datetime.datetime.utcnow()
    arqueo.estimated_cash = estimated_cash
    arqueo.card_sales = card_sales
    arqueo.actual_cash = close_in.actual_cash
    # difference = actual_cash - (initial_cash + estimated_cash)
    arqueo.difference = round(close_in.actual_cash - (arqueo.initial_cash + estimated_cash), 2)
    arqueo.observations = close_in.observations
    
    db.commit()
    db.refresh(arqueo)
    
    return {
        "id": arqueo.id,
        "user_id": arqueo.user_id,
        "username": arqueo.user.username,
        "opened_at": arqueo.opened_at,
        "closed_at": arqueo.closed_at,
        "status": arqueo.status,
        "initial_cash": arqueo.initial_cash,
        "estimated_cash": arqueo.estimated_cash,
        "actual_cash": arqueo.actual_cash,
        "card_sales": arqueo.card_sales,
        "difference": arqueo.difference,
        "observations": arqueo.observations
    }

@router.get("/historial", response_model=List[ArqueoResponse])
def get_arqueo_history(db: Session = Depends(get_db), user_payload: dict = Depends(is_admin)):
    """Fetch historical closed arqueos."""
    arqueos = db.query(Arqueo).filter(Arqueo.status == "CERRADO").order_by(Arqueo.closed_at.desc()).all()
    
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "username": a.user.username,
            "opened_at": a.opened_at,
            "closed_at": a.closed_at,
            "status": a.status,
            "initial_cash": a.initial_cash,
            "estimated_cash": a.estimated_cash,
            "actual_cash": a.actual_cash,
            "card_sales": a.card_sales,
            "difference": a.difference,
            "observations": a.observations
        }
        for a in arqueos
    ]

@router.get("/{arqueo_id}/pdf")
def get_arqueo_pdf_report(
    arqueo_id: int, 
    db: Session = Depends(get_db), 
    user_payload: dict = Depends(is_admin)
):
    """Generate and return a formal PDF report of the specified arqueo."""
    arqueo = db.query(Arqueo).options(joinedload(Arqueo.user)).filter(Arqueo.id == arqueo_id).first()
    if not arqueo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Sesión de arqueo no encontrada"
        )
        
    pdf_buffer = generate_arqueo_pdf(arqueo, db)
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=arqueo_caja_{arqueo_id}.pdf"}
    )
