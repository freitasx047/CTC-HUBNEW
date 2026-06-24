const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// =============================================
// BANCO DE DADOS DAS KEYS (em memória + JSON)
// =============================================
const KEYS_FILE = 'keys.json';

// Carrega keys do arquivo ou cria novo
let keysDB = {};
if (fs.existsSync(KEYS_FILE)) {
    keysDB = JSON.parse(fs.readFileSync(KEYS_FILE));
} else {
    // Keys iniciais
    keysDB = {
        "CTC-FREE-2024": {
            tipo: "free",
            validade: "2026-12-31",
            usuario: "demonstracao",
            ativo: true,
            criadaEm: new Date().toISOString()
        },
        "CTC-VIP-2024": {
            tipo: "vip",
            validade: "2027-12-31",
            usuario: "membro_vip",
            ativo: true,
            criadaEm: new Date().toISOString()
        }
    };
    salvarKeys();
}

function salvarKeys() {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keysDB, null, 2));
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
function gerarKey(tamanho = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'CTC-';
    for (let i = 0; i < tamanho; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

function calcularValidade(dias) {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return data.toISOString().split('T')[0]; // YYYY-MM-DD
}

function isKeyValida(key) {
    const info = keysDB[key];
    if (!info) return { valida: false, msg: 'Key não encontrada' };
    if (!info.ativo) return { valida: false, msg: 'Key desativada' };
    
    const hoje = new Date().toISOString().split('T')[0];
    if (hoje > info.validade) {
        return { valida: false, msg: 'Key expirada' };
    }
    
    return { valida: true, msg: 'Key válida!', tipo: info.tipo };
}

// =============================================
// ROTAS DA API
// =============================================

// 1. Verificar Key
app.post('/api/verify', (req, res) => {
    const { key } = req.body;
    
    if (!key) {
        return res.status(400).json({ 
            success: false, 
            message: 'Key não fornecida' 
        });
    }
    
    const resultado = isKeyValida(key);
    
    if (resultado.valida) {
        res.json({
            success: true,
            message: resultado.msg,
            tipo: resultado.tipo,
            key: key
        });
    } else {
        res.json({
            success: false,
            message: resultado.msg
        });
    }
});

// 2. Gerar nova Key
app.post('/api/generate', (req, res) => {
    const { tipo, dias, usuario } = req.body;
    
    if (!tipo || !dias) {
        return res.status(400).json({
            success: false,
            message: 'Tipo e dias são obrigatórios'
        });
    }
    
    let novaKey = gerarKey(4);
    
    // Evita colisão
    while (keysDB[novaKey]) {
        novaKey = gerarKey(4);
    }
    
    keysDB[novaKey] = {
        tipo: tipo,
        validade: calcularValidade(parseInt(dias)),
        usuario: usuario || 'anonimo',
        ativo: true,
        criadaEm: new Date().toISOString()
    };
    
    salvarKeys();
    
    res.json({
        success: true,
        key: novaKey,
        info: keysDB[novaKey]
    });
});

// 3. Listar todas as keys
app.get('/api/keys', (req, res) => {
    const keysList = Object.entries(keysDB).map(([key, info]) => ({
        key: key,
        ...info
    }));
    
    res.json({
        success: true,
        keys: keysList
    });
});

// 4. Desativar key
app.post('/api/deactivate', (req, res) => {
    const { key } = req.body;
    
    if (!keysDB[key]) {
        return res.status(404).json({
            success: false,
            message: 'Key não encontrada'
        });
    }
    
    keysDB[key].ativo = false;
    salvarKeys();
    
    res.json({
        success: true,
        message: 'Key desativada com sucesso'
    });
});

// 5. Ativar key
app.post('/api/activate', (req, res) => {
    const { key } = req.body;
    
    if (!keysDB[key]) {
        return res.status(404).json({
            success: false,
            message: 'Key não encontrada'
        });
    }
    
    keysDB[key].ativo = true;
    salvarKeys();
    
    res.json({
        success: true,
        message: 'Key ativada com sucesso'
    });
});

// 6. Estatísticas
app.get('/api/stats', (req, res) => {
    const total = Object.keys(keysDB).length;
    const ativas = Object.values(keysDB).filter(k => k.ativo).length;
    const expiradas = Object.values(keysDB).filter(k => {
        const hoje = new Date().toISOString().split('T')[0];
        return hoje > k.validade;
    }).length;
    
    res.json({
        success: true,
        stats: {
            total,
            ativas,
            expiradas,
            inativas: total - ativas
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 CTC HUB API rodando em http://localhost:${PORT}`);
    console.log(`📊 Total de keys: ${Object.keys(keysDB).length}`);
});