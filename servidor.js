const express = require('express');
const fs = require('fs').promises; // Módulo de archivos asíncrono
const fsSincrono = require('fs'); // Usado para operaciones rápidas o lectura síncrona
const { existsSync } = require('fs'); // Chequeo rápido de archivos
const path = require('path');
const cors = require('cors'); 
const ExcelJS = require('exceljs'); // Librería para reportes en Excel nativo

const app = express();

app.use(cors());
app.use(express.json());

const ARCHIVO_CSV = path.join(__dirname, 'registro_cargas.csv');

// =========================================================================
// NUEVO ENDPOINT: VERIFICA SI LA PATENTE ESCANEADA EXISTE EN EL CLI.TXT
// =========================================================================
app.get('/verificar-patente', (req, res) => {
    try {
        if (!req.query.patente) {
            return res.status(400).send("Falta el parámetro patente");
        }

        // Tomamos la patente detectada por el celu y le borramos todos los espacios intermedios
        const patenteBuscada = req.query.patente.toUpperCase().replace(/\s+/g, '').trim();
        
        // Ruta física al archivo CLI.TXT en la misma carpeta del servidor
        const rutaTxt = path.join(__dirname, 'CLI.TXT'); 

        // 1. Verificamos si el archivo realmente existe en la carpeta
        if (!fsSincrono.existsSync(rutaTxt)) {
            console.error("❌ Error: No se encontró el archivo CLI.TXT en la carpeta raíz.");
            return res.status(500).send("Error interno: Base de datos CLI.TXT ausente.");
        }

        // 2. Leemos todo el contenido de CLI.TXT
        const contenido = fsSincrono.readFileSync(rutaTxt, 'utf-8');
        
        // 3. Separamos el archivo renglón por renglón
        const lineas = contenido.split('\n');

        let clienteEncontrado = null;

        // 4. Recorremos el archivo renglón por renglón buscando coincidencias
        for (let linea of lineas) {
            if (!linea.trim()) continue; // Salteamos líneas vacías

            // Pasamos la línea a mayúsculas y removemos todos los espacios para cruzar datos sin fallas
            const lineaLimpiaParaBuscar = linea.toUpperCase().replace(/\s+/g, '');

            if (lineaLimpiaParaBuscar.includes(patenteBuscada)) {
                // Al encontrarla, removemos espacios gigantes consecutivos del renglón original para el celular
                const datosProlijos = linea.replace(/\s+/g, ' ').trim();

                clienteEncontrado = {
                    patente: req.query.patente.toUpperCase().trim(),
                    nombre: datosProlijos // Enviamos la línea completa procesada (Código, Patente, Celular, etc.)
                };
                break;
            }
        }

        // 5. Respondemos al celular del playero
        if (clienteEncontrado) {
            console.log(`✅ Patente autorizada encontrada: ${patenteBuscada}`);
            res.status(200).json(clienteEncontrado);
        } else {
            console.log(`❌ Intento de carga con patente NO registrada: ${patenteBuscada}`);
            res.status(404).send("Cliente no registrado");
        }

    } catch (error) {
        console.error("Error al verificar la patente en CLI.TXT:", error);
        res.status(500).send("Error interno al procesar la patente.");
    }
});

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
app.get('/descargar-reporte', async (req, res) => {
    if (!existsSync(ARCHIVO_CSV)) return res.status(404).send("No hay datos para generar el reporte.");
    
    const { desde, hasta } = req.query;

    try {
        const contenido = await fs.readFile(ARCHIVO_CSV, 'utf8');
        const lineas = contenido.split('\n');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte Cargas GNC');

        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Hora', key: 'hora', width: 12 },
            { header: 'Patente', key: 'patente', width: 15 },
            { header: 'Monto Base', key: 'monto', width: 18 },
            { header: 'Descuento ($)', key: 'descuento', width: 18 },
            { header: 'Total Cobrado', key: 'total', width: 18 }
        ];

        worksheet.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F497D' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        let totalFilas = 0;

        const filtroDesde = desde ? new Date(desde.replace(/-/g, '/')) : null;
        const filtroHasta = hasta ? new Date(hasta.replace(/-/g, '/')) : null;

        for (let i = 2; i < lineas.length; i++) {
            if (!lineas[i].trim()) continue;
            
            const columnas = lineas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/"/g, '').trim());
            
            if (columnas.length >= 6) {
                const fechaCargaStr = columnas[0]; 
                const fechaCargaObj = new Date(fechaCargaStr.replace(/-/g, '/'));

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

                filaNueva.getCell('fecha').alignment = { horizontal: 'center' };
                filaNueva.getCell('hora').alignment = { horizontal: 'center' };
                filaNueva.getCell('patente').alignment = { horizontal: 'center' };
                
                filaNueva.getCell('monto').numFmt = '"$"#,##0.00';
                filaNueva.getCell('descuento').numFmt = '"$"#,##0.00';
                filaNueva.getCell('total').numFmt = '"$"#,##0.00';
            }
        }

        if (totalFilas === 0) {
            return res.status(444).send("No se encontraron cargas en el rango de fechas seleccionado.");
        }

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
                const patenteCarga = columnas