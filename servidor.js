const express = require('express');
const fs = require('fs');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.get('/verificar', (req, res) => {
    const patente = req.query.patente.toUpperCase().trim();
    if (!fs.existsSync('CLI.TXT')) return res.status(500).send("No existe CLI.TXT");
    const contenido = fs.readFileSync('CLI.TXT', 'utf-8');
    if (contenido.includes(patente)) {
        res.status(200).send("CLIENTE OK");
    } else {
        res.status(404).send("NO REGISTRADO");
    }
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));