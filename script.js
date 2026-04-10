const firebaseConfig = {
  apiKey: "AIzaSyAeejUNvRX3KvmHMgKUff5vTS44-_UGCSg",
  authDomain: "cortesias-4235e.firebaseapp.com",
  databaseURL: "https://cortesias-4235e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cortesias-4235e",
  storageBucket: "cortesias-4235e.firebasestorage.app",
  messagingSenderId: "45340224860",
  appId: "1:45340224860:web:69c15fc56fc5a04ab76599"
};

// Inicialización única
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
let listaCochesGlobal = {};

// Sincronización de Stock
db.ref('coches').on('value', (snap) => {
    const coches = snap.val();
    if (!coches) return;
    listaCochesGlobal = coches;
    const sSal = document.getElementById('p-veh-select');
    const sEnt = document.getElementById('d-veh-select');
    
    sSal.innerHTML = '<option value="">Seleccionar coche...</option>';
    sEnt.innerHTML = '<option value="">Seleccionar coche prestado...</option>';
    
    for (let id in coches) {
        let c = coches[id];
        let opt = `<option value="${id}">${c.matricula} - ${c.modelo}</option>`;
        if (c.estado === 'Disponible') sSal.innerHTML += opt;
        else if (c.estado === 'Prestado') sEnt.innerHTML += opt;
    }
});

function showTab(tabId) {
    const isSalida = tabId === 'tab-salida';
    document.getElementById('action-salida').style.display = isSalida ? 'block' : 'none';
    document.getElementById('action-entrada').style.display = isSalida ? 'none' : 'block';
    document.getElementById('btn-sal').className = isSalida ? 'btn-tab active' : 'btn-tab';
    document.getElementById('btn-ent').className = isSalida ? 'btn-tab' : 'btn-tab active';
}

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (id && listaCochesGlobal[id]) {
        const c = listaCochesGlobal[id];
        document.getElementById('p-mod').value = c.modelo || "";
        document.getElementById('p-kms').value = c.kms || 0;
        document.getElementById('p-comb').value = c.combustible || "";
        document.getElementById('p-mat-print').value = c.matricula || "";
        document.getElementById('p-f-salida').value = new Date().toLocaleString();
    }
}

async function verEstadoSalida() {
    const idCoche = document.getElementById('d-veh-select').value;
    if (!idCoche) return;
    const matricula = listaCochesGlobal[idCoche].matricula;
    
    try {
        const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');
        if (snap.exists()) {
            const d = Object.values(snap.val())[0];
            // Volcado automático de datos de salida a la izquierda
            document.getElementById('p-nom').value = d.nombre || "";
            document.getElementById('p-dni').value = d.dni || "";
            document.getElementById('p-cp').value = d.cp || "";
            document.getElementById('p-tel').value = d.tel || "";
            document.getElementById('p-mat-c').value = d.matCliente || "";
            document.getElementById('p-cia-seguros').value = d.ciaSeguros || "";
            document.getElementById('p-poliza').value = d.poliza || "";
            document.getElementById('p-tel-seguro').value = d.telSeguro || "";
            document.getElementById('p-or').value = d.or || "";
            document.getElementById('p-asesor').value = d.asesor || "";
            document.getElementById('p-mod').value = d.modelo || "";
            document.getElementById('p-mat-print').value = d.matricula || "";
            document.getElementById('p-kms').value = d.kms || "";
            document.getElementById('p-comb').value = d.combustible || "";
            document.getElementById('p-f-salida').value = d.fechaSalida || "";
            document.getElementById('p-obs').value = d.obs || "";
            
            if(d.tarifa) {
                const rb = document.querySelector(`input[name="tarifa"][value="${d.tarifa}"]`);
                if(rb) rb.checked = true;
            }
            document.getElementById('d-f-entrada').value = new Date().toLocaleString();
        }
    } catch (e) { console.error("Error cargando contrato:", e); }
}

async function finalizarSalida() {
    const idCoche = document.getElementById('p-veh-select').value;
    const tarifaSel = document.querySelector('input[name="tarifa"]:checked');
    
    if (!idCoche) return alert("Por favor, selecciona un vehículo.");
    if (!tarifaSel) return alert("Debes seleccionar una Tarifa (Gratuita, Reducida o Estándar).");

    const contrato = {
        matricula: listaCochesGlobal[idCoche].matricula,
        modelo: document.getElementById('p-mod').value,
        nombre: document.getElementById('p-nom').value,
        dni: document.getElementById('p-dni').value,
        cp: document.getElementById('p-cp').value,
        tel: document.getElementById('p-tel').value,
        matCliente: document.getElementById('p-mat-c').value,
        ciaSeguros: document.getElementById('p-cia-seguros').value,
        poliza: document.getElementById('p-poliza').value,
        telSeguro: document.getElementById('p-tel-seguro').value,
        or: document.getElementById('p-or').value,
        asesor: document.getElementById('p-asesor').value,
        tarifa: tarifaSel.value,
        kms: document.getElementById('p-kms').value,
        combustible: document.getElementById('p-comb').value,
        fechaSalida: document.getElementById('p-f-salida').value,
        obs: document.getElementById('p-obs').value,
        estado: "Activo"
    };

    try {
        await db.ref('contratos').push(contrato);
        await db.ref('coches/' + idCoche).update({ estado: 'Prestado' });
        window.print();
        setTimeout(() => { location.reload(); }, 1000);
    } catch (e) {
        alert("Error al guardar en Base de Datos: " + e.message);
    }
}

async function finalizarEntrada() {
    const idCoche = document.getElementById('d-veh-select').value;
    const kmsIn = document.getElementById('d-kms').value;
    
    if (!idCoche || !kmsIn) return alert("Selecciona coche e indica los KMs de entrada.");

    try {
        const matricula = listaCochesGlobal[idCoche].matricula;
        const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');

        if (snap.exists()) {
            const key = Object.keys(snap.val())[0];
            await db.ref('contratos/' + key).update({ 
                estado: "Cerrado", 
                fechaEntrada: document.getElementById('d-f-entrada').value,
                kmsEntrada: kmsIn,
                danosEntrada: document.getElementById('d-danos').value
            });
            await db.ref('coches/' + idCoche).update({ 
                estado: 'Disponible', 
                kms: kmsIn,
                combustible: document.getElementById('d-comb').value 
            });
            window.print();
            setTimeout(() => { location.reload(); }, 1000);
        }
    } catch (e) {
        alert("Error en devolución: " + e.message);
    }
}
