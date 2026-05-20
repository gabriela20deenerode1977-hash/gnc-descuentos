const express = require('express');
const fs = require('fs').promises; // Módulo de archivos asíncrono
const { existsSync } = require('fs'); // Chequeo rápido de archivos
const path = require('path');
const cors = require('cors'); 
const ExcelJS = require('exceljs'); // Librería para reportes en Excel nativo

const app = express();

app.use(cors());
app.use(express.json());

const ARCHIVO_CSV = path.join(__dirname, 'registro_cargas.csv');

// 1. RECIBE LOS DATOS DEL CELULAR DEL PLAYERO
app.post('/guardar-carga', async (req, res) => {
    try {
        const { patente, monto, total } = req.body;
        const opcionesFecha = { timeZone: "America/Argentina/Buenos_Aires", year: 'numeric', month: '2-digit', day: '2-digit' };
        const opcionesHora = { timeZone: "America/Argentina/Buenos_Aires", hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        
        const fechaHoy = new Date().toLocaleDateString("es-AR", opcionesFecha).split('/').reverse().join('-'); 
        const horaHoy = new Date().toLocaleTimeString("es-AR", opcionesHora);
        const descuento = (parseFloat(monto) * 0.05).toFixed(2);
        
        if (!existsSync(ARCHIVO_CSV)) {
            await fs.writeFile(ARCHIVO_CSV, "sep=,\nFecha,Hora,Patente,Monto Base,Descuento ($),Total Cobrado\n", 'utf8');
        }
        
        const nuevaLinea = `"${fechaHoy}","${horaHoy}","${patente.toUpperCase().trim()}","${parseFloat(monto).toFixed(2)}","${descuento}","${parseFloat(total).toFixed(2)}"\n`;
        
        await fs.appendFile(ARCHIVO_CSV, nuevaLinea, 'utf8');
        
        console.log(`[CUPÓN REGISTRADO] ${fechaHoy} | Patente: ${patente.toUpperCase().trim()}`);
        res.status(200).json({ status: "success" });
    } catch (error) {
        console.error("Error al guardar la carga:", error);
        res.status(500).json({ status: "error" });
    }
});

// 2. GENERA Y DESCARGA EL REPORTE EN EXCEL FILTRADO POR PERÍODO
// Ejemplo de uso: /descargar-reporte?desde=2026-05-01&hasta=2026-05-15
app.get('/descargar-reporte', async (req, res) => {
    if (!existsSync(ARCHIVO_CSV)) return res.status(404).send("No hay datos para generar el reporte.");
    
    // Capturamos las fechas que vienen desde la web (formato AAAA-MM-DD)
    const { desde, hasta } = req.query;

    try {
        const contenido = await fs.readFile(ARCHIVO_CSV, 'utf8');
        const lineas = contenido.split('\n');

        // Inicializar el libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte Cargas GNC');

        // Configurar títulos y anchos de columnas
        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Hora', key: 'hora', width: 12 },
            { header: 'Patente', key: 'patente', width: 15 },
            { header: 'Monto Base', key: 'monto', width: 18 },
            { header: 'Descuento ($)', key: 'descuento', width: 18 },
            { header: 'Total Cobrado', key: 'total', width: 18 }
        ];

        // Diseño del Encabezado (Azul marino corporativo y texto blanco)
        worksheet.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F497D' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        let totalFilas = 0;

        // Variables para convertir los filtros a formato Fecha para comparar de forma segura
        const filtroDesde = desde ? new Date(desde.replace(/-/g, '/')) : null;
        const filtroHasta = hasta ? new Date(hasta.replace(/-/g, '/')) : null;

        // Leer los datos históricos e filtrarlos fila por fila
        for (let i = 2; i < lineas.length; i++) {
            if (!lineas[i].trim()) continue;
            
            const columnas = lineas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/"/g, '').trim());
            
            if (columnas.length >= 6) {
                const fechaCargaStr = columnas[0]; // AAAA-MM-DD
                const fechaCargaObj = new Date(fechaCargaStr.replace(/-/g, '/'));

                // Aplicamos el filtro de "Periodo" si fue enviado desde la web
                if (filtroDesde && fechaCargaObj < filtroDesde) continue;
                if (filtroHasta && fechaCargaObj > filtroHasta) continue;

                totalFilas++;
                const filaNueva = worksheet.addRow({
                    fecha: fechaCargaStr,
                    hora: columnas[1],
                    patente: columnas[2].toUpperCase(),
                    monto: parseFloat(columnas[3]),
                    descuento: parseFloat(columnas[4]),
                    total: parseFloat(columnas[5])
                });

                // Alineación de textos
                filaNueva.getCell('fecha').alignment = { horizontal: 'center' };
                filaNueva.getCell('hora').alignment = { horizontal: 'center' };
                filaNueva.getCell('patente').alignment = { horizontal: 'center' };
                
                // Formato de moneda
                filaNueva.getCell('monto').numFmt = '"$"#,##0.00';
                filaNueva.getCell('descuento').numFmt = '"$"#,##0.00';
                filaNueva.getCell('total').numFmt = '"$"#,##0.00';
            }
        }

        if (totalFilas === 0) {
            return res.status(444).send("No se encontraron cargas en el rango de fechas seleccionado.");
        }

        // Agregar fila automática de TOTALES (Fórmulas SUM) al final
        const filaTotal = worksheet.addRow({
            fecha: 'TOTALES',
            hora: '',
            patente: '',
            monto: { formula: `SUM(D2:D${totalFilas + 1})` },
            descuento: { formula: `SUM(E2:E${totalFilas + 1})` },
            total: { formula: `SUM(F2:F${totalFilas + 1})` }
        });

        filaTotal.font = { name: 'Arial', size: 11, bold: true };
        filaTotal.getCell('monto').numFmt = '"$"#,##0.00';
        filaTotal.getCell('descuento').numFmt = '"$"#,##0.00';
        filaTotal.getCell('total').numFmt = '"$"#,##0.00';
        
        worksheet.getRow(totalFilas + 2).border = {
            top: { style: 'thin' },
            bottom: { style: 'double' }
        };

        // Nombre del archivo dinámico según el periodo elegido
        const nombreArchivo = (desde && hasta) ? `Reporte_GNC_${desde}_a_${hasta}.xlsx` : 'Reporte_Oficial_GNC.xlsx';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error al generar el reporte de Excel:", error);
        res.status(500).send("Error interno al procesar el Excel.");
    }
});

// 3. CONSULTA DE AHORRO SEMANAL PARA EL CLIENTE
app.get('/ahorro-cliente/:patente', async (req, res) => {
    const patenteBuscada = req.params.patente.toUpperCase().trim();
    if (!existsSync(ARCHIVO_CSV)) {
        return res.json({ totalAhorrado: "0.00", historial: [] });
    }

    try {
        const contenido = await fs.readFile(ARCHIVO_CSV, 'utf8');
        const lineas = contenido.split('\n');
        
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const hace7Dias = new Date(hoy.getTime() - (7 * 24 * 60 * 60 * 1000));

        let totalAhorrado = 0;
        let historial = [];

        for (let i = 2; i < lineas.length; i++) {
            if (!lineas[i].trim()) continue;
            
            const columnas = lineas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/"/g, '').trim());
            
            if (columnas.length >= 6) {
                const fechaCarga = columnas[0]; 
                const patenteCarga = columnas[2].toUpperCase();
                const descCarga = parseFloat(columnas[4]) || 0;
                const totalCarga = parseFloat(columnas[5]) || 0;

                const fechaObjeto = new Date(fechaCarga.replace(/-/g, '/'));

                if (patenteCarga === patenteBuscada && fechaObjeto >= hace7Dias) {
                    totalAhorrado += descCarga;
                    historial.push({
                        fecha: fechaCarga,
                        ahorro: descCarga.toFixed(2),
                        total: totalCarga.toFixed(2)
                    });
                }
            }
        }

        res.json({
            patente: patenteBuscada,
            totalAhorrado: totalAhorrado.toFixed(2),
            historial: historial.reverse() 
        });
    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({ error: "Error en la consulta" });
    }
});

app.listen(3000, () => {
    console.log("⛽ Servidor GNC activo con filtro por período en el puerto 3000");
});