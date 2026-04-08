// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================
// SUSTITUYE ESTOS DATOS CON LOS DE TU PROYECTO (Consola Firebase -> Configuración del proyecto)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let todosLosCoches = {};

// ==========================================
// 2. INICIO Y ESCUCHA DE DATOS
// ==========================================
window.onload = () => {
    escucharCoches();
};

// Escucha cambios en tiempo real en la base de datos
function escucharCoches() {
    db.ref('coches').on('value', (snapshot) => {
        todosLosCoches = snapshot.val() || {};
        actualizarSelects();
    });
}

function actualizarSelects() {
    let htmlSalida = '<option value="">-- Seleccionar Disponible --</option>';
    let htmlEntrada = '<option value="">-- Seleccionar Prestado --</option>';
    
    Object.keys(todosLosCoches).forEach(id => {
        const c = todosLosCoches[id];
        if (c.estado === "Disponible") {
            htmlSalida += `<option value="${id}">${c.matricula}</option>`;
        } else {
            htmlEntrada += `<option value="${id}">${c.matricula} (En uso)</option>`;
        }
    });
    
    document.getElementById('p-veh-select').innerHTML = htmlSalida;
    document.getElementById('d-veh-select').innerHTML = htmlEntrada;
}

// ==========================================
// 3. NAVEGACIÓN Y AUTO-RELLENO
// ==========================================
function showTab(id) {
    document.getElementById('tab-salida').style.display = id === 'tab-salida' ? 'block' : 'none';
    document.getElementById('tab-entrada').style.display = id === 'tab-entrada' ? 'block' : 'none';
    document.getElementById('btn-sal').classList.toggle('active', id === 'tab-salida');
    document.getElementById('btn-ent').classList.toggle('active', id === 'tab-entrada');
}

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (!id) return;
    const coche = todosLosCoches[id];
    document.getElementById('p-mod').value = coche.modelo || "";
    document.getElementById('p-kms').value = coche.kms || "";
    document.getElementById('p-comb').value = coche.combustible || "";
}

// ==========================================
// 4. GESTIÓN DE SALIDAS (REGISTRO E IMPRESIÓN)
// ==========================================
async function finalizarSalida() {
    const id = document.getElementById('p-veh-select').value;
    if (!id) return alert("Por favor, selecciona un vehículo.");

    const btn = document.getElementById('btn-salida');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    const d = {
        matricula: todosLosCoches[id].matricula,
        modelo: document.getElementById('p-mod').value,
        kms: document.getElementById('p-kms').value,
        combustible: document.getElementById('p-comb').value,
        matCliente: document.getElementById('p-mat-c').value,
        or: document.getElementById('p-or').value,
        motivo: document.getElementById('p-motivo').value,
        tarifa: document.getElementById('p-tarifa').value,
        nombre: document.getElementById('p-nom').value,
        dni: document.getElementById('p-dni').value,
        tel: document.getElementById('p-tel').value,
        cp: document.getElementById('p-cp').value,
        fNac: document.getElementById('p-fnac').value,
        fCarnet: document.getElementById('p-fcarnet').value,
        fCaducidad: document.getElementById('p-fcad').value,
        fAprox: document.getElementById('p-faprox').value,
        obs: document.getElementById('p-obs').value,
        fechaSalida: new Date().toLocaleString()
    };

    try {
        // 1. Guardar en historial de contratos
        await db.ref('contratos').push(d);
        
        // 2. Cambiar estado del coche a "Prestado"
        await db.ref('coches/' + id).update({ 
            estado: "Prestado",
            kms: d.kms,
            combustible: d.combustible
        });

        // 3. Generar y abrir contrato para impresión
        const contenidoContrato = generarContratoHTML(d);
        const ventanaImpresion = window.open('', '_blank');
        ventanaImpresion.document.write(contenidoContrato);
        ventanaImpresion.document.close();
        
        // Esperar un poco a que cargue el contenido antes de imprimir
        setTimeout(() => {
            ventanaImpresion.print();
            location.reload();
        }, 500);

    } catch (e) {
        alert("Error al guardar: " + e.message);
        btn.disabled = false;
        btn.innerText = "GRABAR E IMPRIMIR";
    }
}

// ==========================================
// 5. GESTIÓN DE ENTRADAS (DEVOLUCIÓN)
// ==========================================
async function finalizarEntrada() {
    const id = document.getElementById('d-veh-select').value;
    if (!id) return alert("Selecciona el coche a recibir.");

    const kmsEnt = document.getElementById('d-kms').value;
    const combEnt = document.getElementById('d-comb').value;
    
    if (!kmsEnt) return alert("Introduce los KMs de entrada.");

    try {
        await db.ref('coches/' + id).update({
            estado: "Disponible",
            kms: kmsEnt,
            combustible: combEnt
        });
        alert("¡Vehículo liberado y actualizado!");
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// ==========================================
// 6. PLANTILLA DEL CONTRATO (DISEÑO A4)
// ==========================================
function generarContratoHTML(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; line-height: 1.2; }
        .sheet-container { width: 100%; max-width: 800px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .logo-img { width: 300px; }
        .fecha-box { border: 1px solid #000; padding: 10px; font-weight: bold; }
        .main-title { text-align: center; font-weight: bold; font-size: 16px; margin: 15px 0; border: 2px solid #000; padding: 8px; background-color: #f2f2f2; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        td { border: 1px solid #000; padding: 8px; font-size: 12px; }
        .label { font-weight: bold; background-color: #f9f9f9; width: 25%; }
        .section-title { font-weight: bold; font-size: 13px; margin: 15px 0 5px 0; background: #eee; padding: 5px; border: 1px solid #000; }
        .firma-wrapper { display: flex; justify-content: space-between; margin-top: 40px; }
        .firma-box { width: 45%; border: 1px solid #000; height: 120px; text-align: center; padding: 5px; }
        .firma-linea { margin-top: 80px; border-top: 1px solid #000; width: 80%; margin-left: 10%; }
        .dev-footer { margin-top: 20px; border: 2px solid #000; padding: 10px; background: #fdfdfd; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="sheet-container">
        <div class="header">
          <img src="https://i.imgur.com/NQH1nT0.png" class="logo-img">
          <div class="fecha-box">FECHA: ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="main-title">HOJA DE CESIÓN VEHÍCULO DE SUSTITUCIÓN</div>

        <table>
          <tr>
            <td class="label">Nº OR:</td><td>${data.or || '---'}</td>
            <td class="label">MATRÍCULA CLIENTE:</td><td>${data.matCliente || '---'}</td>
          </tr>
          <tr>
            <td class="label">MATRÍCULA CEDIDO:</td><td><b>${data.matricula}</b></td>
            <td class="label">MARCA / MODELO:</td><td>${data.modelo}</td>
          </tr>
          <tr>
            <td class="label">KMS SALIDA:</td><td>${data.kms}</td>
            <td class="label">COMBUSTIBLE:</td><td>${data.combustible}</td>
          </tr>
        </table>

        <div class="section-title">DATOS DEL CLIENTE</div>
        <table>
          <tr><td class="label">NOMBRE COMPLETO:</td><td colspan="3">${data.nombre}</td></tr>
          <tr>
            <td class="label">DNI / NIE:</td><td>${data.dni}</td>
            <td class="label">TELÉFONO:</td><td>${data.tel}</td>
          </tr>
          <tr>
            <td class="label">F. NACIMIENTO:</td><td>${data.fNac}</td>
            <td class="label">C. POSTAL:</td><td>${data.cp}</td>
          </tr>
        </table>

        <div style="margin-top:10px; font-size:12px;">
          <b>F. APROX. DEVOLUCIÓN:</b> ${data.fAprox} | <b>MOTIVO:</b> ${data.motivo} | <b>TARIFA:</b> ${data.tarifa}
          <br><br>
          <b>OBSERVACIONES:</b> ${data.obs || 'Sin observaciones'}
        </div>

        <div class="firma-wrapper">
          <div class="firma-box"><b>Fdo. CLIENTE (Salida)</b><div class="firma-linea"></div></div>
          <div class="firma-box"><b>Fdo. CLIENTE (Entrada)</b><div class="firma-linea"></div></div>
        </div>

        <div class="dev-footer">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 5px;">USO EXCLUSIVO TALLER (Devolución):</div>
          <div style="font-size: 11px;">
            KMS ENTRADA: _______________ &nbsp;&nbsp;&nbsp; COMBUSTIBLE: _______________ &nbsp;&nbsp;&nbsp; CARGOS: ☐ SI ☐ NO
          </div>
        </div>
      </div>
    </body>
    </html>`;
}
