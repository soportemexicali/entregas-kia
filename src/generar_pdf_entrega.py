from weasyprint import HTML

def generar_pdf_inspeccion(datos_inspeccion, archivo_salida="inspeccion_vehicular.pdf"):
    """
    Genera un reporte PDF profesional con datos, checklist y fotos incrustadas.
    """
    # datos_inspeccion debe ser un diccionario con:
    # vin, responsable, fecha, checklist (dict), fotos (dict con urls o rutas locales)
    
    vin = datos_inspeccion.get("vin", "SIN-VIN")
    responsable = datos_inspeccion.get("responsable", "Sin Asesor")
    fecha = datos_inspeccion.get("fecha", "Fecha no especificada")
    checklist = datos_inspeccion.get("checklist", {})
    fotos = datos_inspeccion.get("fotos", {})

    # Construir filas del checklist en HTML
    checklist_html = ""
    for item, detalle in checklist.items():
        estado = "REVISADO" if detalle.get("checked") else "PENDIENTE"
        clase_estado = "estado-revisado" if detalle.get("checked") else "estado-pendiente"
        comentario = detalle.get("comment", "")
        
        comentario_html = f'<div class="comentario">"{comentario}"</div>' if comentario else ''
        
        checklist_html += f"""
        <tr>
            <td style="font-weight: 500;">{item}</td>
            <td class="text-center"><span class="{clase_estado}">{estado}</span></td>
            <td>{comentario_html}</td>
        </tr>
        """

    # Construir galería de fotos incrustadas
    fotos_html = ""
    for etiqueta, url_foto in fotos.items():
        if url_foto:
            fotos_html += f"""
            <div class="foto-card">
                <img src="{url_foto}" alt="{etiqueta}" />
                <div class="foto-label">{etiqueta.upper()}</div>
            </div>
            """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 15mm;
                background-color: #ffffff;
            }}
            * {{
                box-sizing: border-box;
            }}
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1e293b;
                margin: 0;
                padding: 0;
                font-size: 11pt;
                line-height: 1.4;
            }}
            .header {{
                border-bottom: 2px solid #0f172a;
                padding-bottom: 15px;
                margin-bottom: 20px;
                display: block;
            }}
            .titulo-empresa {{
                font-size: 18pt;
                font-weight: bold;
                color: #0f172a;
                letter-spacing: 0.5px;
            }}
            .subtitulo {{
                font-size: 10pt;
                color: #64748b;
                text-transform: uppercase;
                margin-top: 2px;
            }}
            .meta-box {{
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px 15px;
                margin-bottom: 20px;
            }}
            .meta-grid {{
                width: 100%;
            }}
            .meta-grid td {{
                padding: 4px 0;
            }}
            .label-meta {{
                font-size: 9pt;
                color: #64748b;
                text-transform: uppercase;
                font-weight: bold;
            }}
            .value-meta {{
                font-size: 11pt;
                color: #0f172a;
                font-weight: 600;
            }}
            h2 {{
                font-size: 13pt;
                color: #0f172a;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 5px;
                margin-top: 25px;
                margin-bottom: 10px;
            }}
            table.tabla-check {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            table.tabla-check th {{
                background-color: #0f172a;
                color: #ffffff;
                text-align: left;
                padding: 8px 10px;
                font-size: 10pt;
            }}
            table.tabla-check td {{
                padding: 8px 10px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 10pt;
                vertical-align: middle;
            }}
            .text-center {{
                text-align: center;
            }}
            .estado-revisado {{
                background-color: #d1fae5;
                color: #065f46;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 9pt;
                font-weight: bold;
            }}
            .estado-pendiente {{
                background-color: #f1f5f9;
                color: #475569;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 9pt;
                font-weight: bold;
            }}
            .comentario {{
                font-size: 9pt;
                color: #64748b;
                font-style: italic;
                margin-top: 3px;
            }}
            .fotos-grid {{
                width: 100%;
                margin-top: 15px;
            }}
            .foto-card {{
                display: inline-block;
                width: 47%;
                margin: 1.5%;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                overflow: hidden;
                background: #f8fafc;
                text-align: center;
                page-break-inside: avoid;
            }}
            .foto-card img {{
                width: 100%;
                height: 160px;
                object-fit: cover;
                display: block;
            }}
            .foto-label {{
                background-color: #0f172a;
                color: white;
                font-size: 9pt;
                font-weight: bold;
                padding: 5px;
                text-transform: uppercase;
            }}
        </style>
    </head>
    <body>

        <div class="header">
            <div class="titulo-empresa">KIA FUTURA</div>
            <div class="subtitulo">Reporte Oficial de Inspección y Entrega Vehicular</div>
        </div>

        <div class="meta-box">
            <table class="meta-grid">
                <tr>
                    <td><span class="label-meta">VIN del Vehículo:</span></td>
                    <td><span class="label-meta">Asesor Responsable:</span></td>
                    <td><span class="label-meta">Fecha y Hora:</span></td>
                </tr>
                <tr>
                    <td><span class="value-meta" style="font-family: monospace;">{vin}</span></td>
                    <td><span class="value-meta">{responsable}</span></td>
                    <td><span class="value-meta">{fecha}</span></td>
                </tr>
            </table>
        </div>

        <h2>Lista de Puntos Revisados</h2>
        <table class="tabla-check">
            <thead>
                <tr>
                    <th style="width: 45%;">Componente / Punto</th>
                    <th style="width: 25%; text-align: center;">Estado</th>
                    <th style="width: 30%;">Observaciones</th>
                </tr>
            </thead>
            <tbody>
                {checklist_html}
            </tbody>
        </table>

        <h2>Evidencias Fotográficas</h2>
        <div class="fotos-grid">
            {fotos_html}
        </div>

    </body>
    </html>
    """

    # Compilar a PDF usando WeasyPrint
    HTML(string=html_content).write_pdf(archivo_salida)
    print(f"PDF generado exitosamente: {archivo_salida}")

# Ejemplo de uso:
if __name__ == "__main__":
    datos_prueba = {
        "vin": "5TDZA23CX6S422465",
        "responsable": "JESUS MARMOLEJO",
        "fecha": "11 de Septiembre de 2026, 12:00 PM",
        "checklist": {
            "Carrocería": {"checked": True, "comment": "Sin rayones aparentes"},
            "Tapetes uso rudo": {"checked": True, "comment": ""},
            "Motor": {"checked": False, "comment": "Pendiente revisión de niveles"}
        },
        "fotos": {
            "frente": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80",
            "tablero": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"
        }
    }
    generar_pdf_inspeccion(datos_prueba, "reporte_ejemplo.pdf")