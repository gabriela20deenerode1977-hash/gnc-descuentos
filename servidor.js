const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Sirve los archivos HTML directamente

const ARCHIVO_CSV = path.join(__dirname, 'registro_cargas.csv');

// 1. Recibe los cupones que escanean los playeros desde el celular y los va acumulando
app.post('/guardar-carga', (req, res) => {
    try {
        const { patente, monto, total } = req.body;
        
        // Formatea la fecha y hora actual de Argentina
        const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
        const descuento = (parseFloat(monto) * 0.05).toFixed(2);
        
        // Si es la primera vez que se usa, crea el archivo con los títulos de columna
        if (!fs.existsSync(ARCHIVO_CSV)) {
            fs.writeFileSync(ARCHIVO_CSV, "sep=,\nFecha y Hora,Patente,Monto Base,Descuento ($),Total Cobrado\n", 'utf8');
        }
        
        // Agrega la nueva fila abajo de todo sin borrar lo anterior
        const nuevaLinea = `"${fecha}","${patente.toUpperCase()}","${parseFloat(monto).toFixed(2)}","${descuento}","${parseFloat(total).toFixed(2)}"\n`;
        fs.appendFileSync(ARCHIVO_CSV, nuevaLinea, 'utf8');
        
        console.log(`[OK] Cupón guardado con éxito: ${patente} - Total: $${total}`);
        res.status(200).json({ status: "success", message: "Carga registrada en el servidor" });
    } catch (error) {
        console.error("Error al guardar la carga:", error);
        res.status(500).json({ status: "error", message: "Error interno del servidor" });
    }
});

// 2. Ruta para que descargues el Excel unificado y sumado cada vez que lo pidas
app.get('/descargar-reporte', (req, res) => {
    if (!fs.existsSync(ARCHIVO_CSV)) {
        return res.status(404).send("<h3>Aún no hay cupones guardados en el registro acumulativo.</h3>");
    }
    
    try {
        // Lee el archivo acumulado para calcular las sumas al instante
        const contenido = fs.readFileSync(ARCHIVO_CSV, 'utf8');
        const lineas = contenido.split('\n');
        let sumaBase = 0, sumaDesc = 0, sumaTotal = 0;
        
        // Empieza en la fila 2 para saltear los títulos y sumar solo los números
        for (let i = 2; i < lineas.length; i++) {
            const columnas = lineas[i].split(',');
            if (columnas.length >= 5) {
                sumaBase += parseFloat(columnas[2].replace(/"/g, '')) || 0;
                sumaDesc += parseFloat(columnas[3].replace(/"/g, '')) || 0;
                sumaTotal += parseFloat(columnas[4].replace(/"/g, '')) || 0;
            }
        }
        
        // Crea una copia temporal para la descarga agregando la fila de TOTALES abajo
        let reporteFinal = contenido;
        reporteFinal += `\n"TOTAL GENERAL ACUMULADO","","${sumaBase.toFixed(2)}","${sumaDesc.toFixed(2)}","${sumaTotal.toFixed(2)}"\n`;
        
        // Configura la descarga para que se abra directo en Excel
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_Cupones_GNC.csv`);
        
        // El '\uFEFF' es un código invisible para que Excel reconozca los acentos de una
        res.send(Buffer.from('\uFEFF' + reporteFinal, 'utf-8'));
    } catch (error) {
        console.error("Error al generar el reporte:", error);
        res.status(500).send("Error al generar el archivo de descarga.");
    }
});

// Arranca el sistema en el puerto 3000
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log("=====================================================");
    console.log(`⛽ SERVIDOR GNC ACTIVADO EN EL PUERTO ${PUERTO}`);
    console.log("👉 Guardando cupones en tiempo real.");
    console.log(`👉 Descargá el Excel en: http://localhost:${PUERTO}/descargar-reporte`);
    console.log("=====================================================");
});