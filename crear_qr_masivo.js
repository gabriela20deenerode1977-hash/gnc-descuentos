const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const archivoClientes = path.join(__dirname, 'CLIENTES.TXT');
const carpetaQrs = path.join(__dirname, 'mis_qrs');

if (!fs.existsSync(carpetaQrs)) {
    fs.mkdirSync(carpetaQrs);
}

// Expresiones regulares para buscar patentes dentro de TODO el renglón
// Detecta formatos con o sin espacios: "AAA 123", "AAA123", "AA 123 BB", "AA123BB"
const regexVieja = /\b([A-Z]{3})\s*(\d{3})\b/;
const regexNueva = /\b([A-Z]{2})\s*(\d{3})\s*([A-Z]{2})\b/;

fs.readFile(archivoClientes, 'utf8', async (err, data) => {
    if (err) {
        console.error("❌ No se pudo leer el archivo CLIENTES.TXT.");
        return;
    }

    const lineas = data.split(/\r?\n/);
    let qrsCreados = 0;

    console.log(`⏳ Buscando patentes en los ${lineas.length} registros...`);

    for (let linea of lineas) {
        if (!linea.trim()) continue;

        // Convertimos a mayúsculas para unificar
        const textoLinea = linea.toUpperCase();
        let patenteDetectada = null;

        // 1. Probar si hay una patente Mercosur (Ej: AH 200 BT o AH200BT)
        const matchNueva = textoLinea.match(regexNueva);
        if (matchNueva) {
            patenteDetectada = `${matchNueva[1]}${matchNueva[2]}${matchNueva[3]}`; // Une todo: AH200BT
        } else {
            // 2. Si no, probar si hay una patente vieja (Ej: HTG 879 o HTG879)
            const matchVieja = textoLinea.match(regexVieja);
            if (matchVieja) {
                patenteDetectada = `${matchVieja[1]}${matchVieja[2]}`; // Une todo: HTG879
            }
        }

        // Si encontramos una patente válida en el renglón, fabricamos el QR
        if (patenteDetectada) {
            const rutaDestino = path.join(carpetaQrs, `${patenteDetectada}.png`);
            
            try {
                await QRCode.toFile(rutaDestino, patenteDetectada, {
                    color: { dark: '#000000', light: '#FFFFFF' },
                    width: 300
                });
                console.log(`🚗 [PATENTE ENCONTRADA] QR Creado: ${patenteDetectada}`);
                qrsCreados++;
            } catch (error) {
                console.error(`❌ Error al crear QR para ${patenteDetectada}:`, error);
            }
        }
    }

    console.log(`\n--- 🏁 PROCESO TERMINADO ---`);
    console.log(`🚀 Se generaron ${qrsCreados} códigos QR de patentes reales en la carpeta 'mis_qrs'.`);
});