// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAeejUNvRX3KvmHMgKUff5vTS44-_UGCSg",
  authDomain: "cortesias-4235e.firebaseapp.com",
  databaseURL: "https://cortesias-4235e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cortesias-4235e",
  storageBucket: "cortesias-4235e.firebasestorage.app",
  messagingSenderId: "45340224860",
  appId: "1:45340224860:web:69c15fc56fc5a04ab76599"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let listaCochesGlobal = {};

// --- LÓGICA DEL PANEL DE FIRMA ---
const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');
let drawing = false;

function setupCanvas() {
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    
    const startDrawing = (e) => {
        drawing = true;
        draw(e);
    };
    const stopDrawing = () => {
        drawing = false;
        ctx.beginPath();
    };
    const draw = (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
}

function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// --- GESTIÓN DE PESTAÑAS ---
function showTab(tabId) {
    document.getElementById('tab-salida').style.display = tabId === 'tab-salida' ? 'block' : 'none';
    document.getElementById('tab-entrada').style.display = tabId === 'tab-entrada' ? 'block' : 'none';
    document.getElementById('btn-sal').classList.toggle('active', tabId === 'tab-salida');
    document.getElementById('btn-ent').classList.toggle('active', tabId === 'tab-entrada');
}

// --- CARGAR COCHES DESDE FIREBASE ---
async function cargarCoches() {
    db.ref('coches').on('value', (snap) => {
        const coches = snap.val();
        listaCochesGlobal = coches;
        const selectSalida = document.getElementById('p-veh-select');
        const selectEntrada = document.getElementById('d-veh-select');
        
        selectSalida.innerHTML = '<option value="">Seleccionar coche...</option>';
        selectEntrada.innerHTML = '<option value="">Seleccionar coche...</option>';
        
        for (let id in coches) {
            let c = coches[id];
            let opt = `<option value="${id}">${c.matricula} - ${c.modelo}</option>`;
            if (c.estado === 'Disponible') selectSalida.innerHTML += opt;
            if (c.estado === 'Prestado') selectEntrada.innerHTML += opt;
        }
    });
}

// Autorrelleno al seleccionar coche en Salida
function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (id && listaCochesGlobal[id]) {
        document.getElementById('p-mod').value = listaCochesGlobal[id].modelo || "";
        document.getElementById('p-kms').value = listaCochesGlobal[id].kms || 0;
        document.getElementById('p-comb').value = listaCochesGlobal[id].combustible || "";
    }
}

// --- FINALIZAR SALIDA (GUARDAR E IMPRIMIR) ---
async function finalizarSalida() {
    const idCoche = document.getElementById('p-veh-select').value;
    if (!idCoche) return alert("Por favor, selecciona un vehículo.");
    
    const statusMsg = document.getElementById('upload-status');
    statusMsg.style.display = 'block';
    document.getElementById('btn-salida').disabled = true;

    try {
        const firmaBase64 = canvas.toDataURL('image/png');
        const contrato = {
            matricula: listaCochesGlobal[idCoche].matricula,
            modelo: document.getElementById('p-mod').value,
            kms: parseInt(document.getElementById('p-kms').value),
            combustible: document.getElementById('p-comb').value,
            matCliente: document.getElementById('p-mat-c').value,
            or: document.getElementById('p-or').value,
            motivo: document.getElementById('p-motivo').value,
            tarifa: document.getElementById('p-tarifa').value,
            nombre: document.getElementById('p-nom').value,
            dni: document.getElementById('p-dni').value,
            cp: document.getElementById('p-cp').value,
            tel: document.getElementById('p-tel').value,
            fNac: document.getElementById('p-fnac').value,
            fCarnet: document.getElementById('p-fcarnet').value,
            fCaducidad: document.getElementById('p-fcad').value,
            fAprox: document.getElementById('p-faprox').value,
            obs: document.getElementById('p-obs').value,
            firma: firmaBase64,
            fechaSalida: new Date().toLocaleString(),
            estadoContrato: "Activo"
        };

        // Guardar en contratos y actualizar estado del coche
        await db.ref('contratos').push(contrato);
        await db.ref('coches/' + idCoche).update({ estado: 'Prestado' });

        statusMsg.style.display = 'none';
        
        // Lanzar impresión (El CSS ocultará lo innecesario)
        window.print();
        
        // Recargar tras imprimir para limpiar formulario
        setTimeout(() => { location.reload(); }, 1500);

    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
        statusMsg.style.display = 'none';
        document.getElementById('btn-salida').disabled = false;
    }
}

// --- FINALIZAR ENTRADA (DEVOLUCIÓN) ---
async function verEstadoSalida() {
    const idCoche = document.getElementById('d-veh-select').value;
    const compDiv = document.getElementById('comparativa-salida');
    if (!idCoche) { compDiv.style.display = 'none'; return; }

    const matricula = listaCochesGlobal[idCoche].matricula;
    // Buscar el contrato activo más reciente para esta matrícula
    const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');
    
    if (snap.exists()) {
        const datos = Object.values(snap.val())[0];
        compDiv.style.display = 'block';
        compDiv.innerHTML = `
            <strong>DATOS DE SALIDA:</strong><br>
            👤 Cliente: ${datos.nombre}<br>
            📍 KMs Salida: ${datos.kms} | ⛽ Combustible: ${datos.combustible}<br>
            📅 F. Aprox. Devolución: ${datos.fAprox || 'No indicada'}
        `;
    }
}

async function finalizarEntrada() {
    const idCoche = document.getElementById('d-veh-select').value;
    const kmsEntrada = parseInt(document.getElementById('d-kms').value);
    const combEntrada = document.getElementById('d-comb').value;
    const danos = document.getElementById('d-danos').value;

    if (!idCoche || isNaN(kmsEntrada)) return alert("Introduce los KMs de entrada para continuar.");

    try {
        const matricula = listaCochesGlobal[idCoche].matricula;
        const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');
        
        if (snap.exists()) {
            const key = Object.keys(snap.val())[0];
            const datosS = snap.val()[key];
            const diffKms = kmsEntrada - datosS.kms;

            // Actualizar contrato a cerrado
            await db.ref('contratos/' + key).update({
                fechaEntrada: new Date().toLocaleString(),
                kmsEntrada: kmsEntrada,
                combEntrada: combEntrada,
                danosEntrada: danos,
                estadoContrato: "Cerrado"
            });

            // Actualizar coche a disponible y actualizar sus KMs
            await db.ref('coches/' + idCoche).update({
                estado: 'Disponible',
                kms: kmsEntrada,
                combustible: combEntrada
            });

            alert(`✅ DEVOLUCIÓN COMPLETADA\n\n` +
                  `Vehículo: ${matricula}\n` +
                  `KMs realizados: ${diffKms} km\n` +
                  `Nuevos Daños: ${danos || 'Ninguno'}`);
            
            location.reload();
        }
    } catch (e) {
        alert("Error en devolución: " + e.message);
    }
}

// Inicialización al cargar la ventana
window.onload = () => {
    setupCanvas();
    cargarCoches();
};
