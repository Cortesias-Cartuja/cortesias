// 1. CONFIGURACIÓN FIREBASE (DATOS REALES)
const firebaseConfig = {
  apiKey: "AIzaSyAeejUNvRX3KvmHMgKUff5vTS44-_UGCSg",
  authDomain: "cortesias-4235e.firebaseapp.com",
  databaseURL: "https://cortesias-4235e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cortesias-4235e",
  storageBucket: "cortesias-4235e.firebasestorage.app",
  messagingSenderId: "45340224860",
  appId: "1:45340224860:web:69c15fc56fc5a04ab76599"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// 2. LÓGICA DE FIRMA (CANVAS)
const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');
let drawing = false;

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
        y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
    };
}

canvas.addEventListener('mousedown', () => { drawing = true; ctx.beginPath(); });
canvas.addEventListener('touchstart', (e) => { drawing = true; ctx.beginPath(); e.preventDefault(); });
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
});
canvas.addEventListener('touchmove', (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    e.preventDefault();
});
window.addEventListener('mouseup', () => drawing = false);
window.addEventListener('touchend', () => drawing = false);

function clearSignature() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

// 3. NAVEGACIÓN ENTRE PESTAÑAS
function showTab(tabId) {
    document.getElementById('tab-salida').style.display = tabId === 'tab-salida' ? 'block' : 'none';
    document.getElementById('tab-entrada').style.display = tabId === 'tab-entrada' ? 'block' : 'none';
    document.getElementById('btn-sal').classList.toggle('active', tabId === 'tab-salida');
    document.getElementById('btn-ent').classList.toggle('active', tabId === 'tab-entrada');
}

// 4. CARGA DE COCHES Y AUTORELLENADO
let listaCochesGlobal = {};

db.ref('coches').on('value', snapshot => {
    listaCochesGlobal = snapshot.val() || {};
    const selectSalida = document.getElementById('p-veh-select');
    const selectEntrada = document.getElementById('d-veh-select');
    
    selectSalida.innerHTML = '<option value="">Seleccionar coche...</option>';
    selectEntrada.innerHTML = '<option value="">Seleccionar coche devuelto...</option>';
    
    Object.keys(listaCochesGlobal).forEach(id => {
        const c = listaCochesGlobal[id];
        if (c.estado === 'Disponible') {
            selectSalida.innerHTML += `<option value="${id}">${c.matricula}</option>`;
        } else {
            selectEntrada.innerHTML += `<option value="${id}">${c.matricula} (${c.modelo})</option>`;
        }
    });
});

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (id && listaCochesGlobal[id]) {
        document.getElementById('p-mod').value = listaCochesGlobal[id].modelo;
        document.getElementById('p-kms').value = listaCochesGlobal[id].kms;
        document.getElementById('p-comb').value = listaCochesGlobal[id].combustible || "100%";
    }
}

// 5. COMPARATIVA EN DEVOLUCIÓN (MUESTRA DATOS COMPLETOS)
async function verEstadoSalida() {
    const idCoche = document.getElementById('d-veh-select').value;
    const cont = document.getElementById('comparativa-salida');
    if (!idCoche) { cont.style.display = 'none'; return; }

    const matricula = listaCochesGlobal[idCoche].matricula;
    
    db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value', snap => {
        const data = snap.val();
        if (data) {
            const contrato = Object.values(data)[0];
            cont.style.display = 'block';
            
            // Inyectamos la información completa en el cuadro de comparativa
            cont.innerHTML = `
                <div style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px;">
                    <h4 style="margin:0; color:#002e63;">📌 DATOS DE LA ENTREGA</h4>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                    <p><strong>Cliente:</strong> ${contrato.nombre}</p>
                    <p><strong>DNI:</strong> ${contrato.dni}</p>
                    <p><strong>F. Salida:</strong> ${contrato.fechaSalida}</p>
                    <p><strong>OR / ASPV:</strong> ${contrato.or}</p>
                    <p><strong>KMs al salir:</strong> <span id="info-kms-salida">${contrato.kms}</span></p>
                </div>
                <p style="margin: 10px 0 5px 0;"><strong>Fotos de estado inicial:</strong></p>
                <div id="fotos-salida-contenedor" style="display:flex; gap:5px; overflow-x:auto; padding-bottom: 10px;"></div>
            `;

            const contFotos = document.getElementById('fotos-salida-contenedor');
            if (contrato.fotos) {
                contrato.fotos.forEach(url => {
                    contFotos.innerHTML += `<img src="${url}" class="thumb-salida" style="height:80px; border-radius:4px; border:1px solid #ccc; cursor:pointer;" onclick="window.open('${url}')">`;
                });
            }
        }
    });
}

// 6. FINALIZAR SALIDA (GRABAR)
async function finalizarSalida() {
    const idCoche = document.getElementById('p-veh-select').value;
    if (!idCoche) return alert("Selecciona un vehículo");
    
    const status = document.getElementById('upload-status');
    status.style.display = 'block';

    try {
        const firmaBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const firmaRef = storage.ref(`firmas/${Date.now()}.png`);
        const firmaUrl = await (await firmaRef.put(firmaBlob)).ref.getDownloadURL();

        const fotosInput = document.getElementById('p-fotos');
        let fotosUrls = [];
        for (let file of fotosInput.files) {
            const fRef = storage.ref(`danos/${Date.now()}_${file.name}`);
            const url = await (await fRef.put(file)).ref.getDownloadURL();
            fotosUrls.push(url);
        }

        const contrato = {
            matricula: listaCochesGlobal[idCoche].matricula,
            modelo: document.getElementById('p-mod').value,
            kms: document.getElementById('p-kms').value,
            nombre: document.getElementById('p-nom').value,
            dni: document.getElementById('p-dni').value,
            tel: document.getElementById('p-tel').value,
            or: document.getElementById('p-or').value,
            firma: firmaUrl,
            fotos: fotosUrls,
            fechaSalida: new Date().toLocaleString(),
            estadoContrato: "Activo"
        };

        await db.ref('contratos').push(contrato);
        await db.ref('coches/' + idCoche).update({ estado: 'Prestado' });

        alert("Contrato de Salida Guardado Correctamente");
        window.print();
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        status.style.display = 'none';
    }
}

// 7. FINALIZAR ENTRADA (DEVOLUCIÓN COMPLETA)
async function finalizarEntrada() {
    const idCoche = document.getElementById('d-veh-select').value;
    const kmsEntrada = document.getElementById('d-kms').value;
    const combEntrada = document.getElementById('d-comb').value;
    const notasDanos = document.getElementById('d-danos').value;

    if (!idCoche || !kmsEntrada) return alert("Introduce los KMs de entrada");

    const fechaEntrada = new Date().toLocaleString();

    try {
        // Actualizar el estado del coche
        await db.ref('coches/' + idCoche).update({
            estado: 'Disponible',
            kms: kmsEntrada,
            combustible: combEntrada
        });

        // Buscar el contrato activo para cerrarlo con los datos de entrada
        const matricula = listaCochesGlobal[idCoche].matricula;
        const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');
        
        if (snap.exists()) {
            const key = Object.keys(snap.val())[0];
            await db.ref('contratos/' + key).update({
                fechaEntrada: fechaEntrada,
                kmsEntrada: kmsEntrada,
                combEntrada: combEntrada,
                danosEntrada: notasDanos,
                estadoContrato: "Cerrado"
            });
        }

        alert(`Vehículo Recogido\nFecha: ${fechaEntrada}\nKMs: ${kmsEntrada}`);
        window.print();
        location.reload();
    } catch (e) {
        alert("Error al procesar la devolución: " + e.message);
    }
}
