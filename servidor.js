const express = require('express');
const fs = require('fs');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Verificar Patente
app.get('/verificar', (req, res) => {
    const patente = req.query.patente.toUpperCase().trim();
    const contenido = fs.readFileSync('CLI.TXT', 'utf-8');
    res.status(200).send(contenido.includes(patente) ? "CLIENTE OK" : "NO REGISTRADO");
});

// Guardar carga (Manual y Escáner)
app.post('/guardar', (req, res) => {
    const { patente, monto } = req.body;
    const linea = `${new Date().toLocaleString()} | Patente: ${patente} | Monto: ${monto}\n`;
    fs.appendFileSync('registro_cargas.csv', linea);
    res.status(200).send("Guardado");
});

// Reporte para Admin
app.get('/reporte', (req, res) => {
    const datos = fs.readFileSync('registro_cargas.csv', 'utf-8');
    res.send(datos);
});

// Cierre de Turno (Limpia el archivo de registros para empezar de cero)
app.post('/cierre', (req, res) => {
    fs.writeFileSync('registro_cargas.csv', 'FECHA,PATENTE,MONTO\n');
    res.status(200).send("Turno cerrado y reporte limpiado");
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));