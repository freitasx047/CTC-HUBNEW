const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// =============================================
// BANCO DE DADOS EM MEMÓRIA
// =============================================
let keysDB = {
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
    data.setDate(data.getDate() + parseInt(dias));
    return data.toISOString().split('T')[0];
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

// 1. VERIFICAR KEY
app.post('/api/verify', (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno: ' + error.message
        });
    }
});

// 2. GERAR KEY
app.post('/api/generate', (req, res) => {
    try {
        const { tipo, dias, usuario } = req.body;
        
        if (!tipo || !dias) {
            return res.status(400).json({
                success: false,
                message: 'Tipo e dias são obrigatórios'
            });
        }
        
        let novaKey = gerarKey(4);
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
        
        res.json({
            success: true,
            key: novaKey,
            info: keysDB[novaKey]
        });
        
    } catch (error) {
        console.error('Erro ao gerar key:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar key: ' + error.message
        });
    }
});

// 3. LISTAR KEYS
app.get('/api/keys', (req, res) => {
    try {
        const keysList = Object.entries(keysDB).map(([key, info]) => ({
            key: key,
            ...info
        }));
        
        res.json({
            success: true,
            keys: keysList
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao listar keys'
        });
    }
});

// 4. ESTATÍSTICAS
app.get('/api/stats', (req, res) => {
    try {
        const total = Object.keys(keysDB).length;
        const ativas = Object.values(keysDB).filter(k => k.ativo).length;
        const hoje = new Date().toISOString().split('T')[0];
        const expiradas = Object.values(keysDB).filter(k => hoje > k.validade).length;
        
        res.json({
            success: true,
            stats: {
                total,
                ativas,
                expiradas,
                inativas: total - ativas
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar stats'
        });
    }
});

// 5. DESATIVAR KEY
app.post('/api/deactivate', (req, res) => {
    try {
        const { key } = req.body;
        
        if (!keysDB[key]) {
            return res.status(404).json({
                success: false,
                message: 'Key não encontrada'
            });
        }
        
        keysDB[key].ativo = false;
        
        res.json({
            success: true,
            message: 'Key desativada com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao desativar key'
        });
    }
});

// 6. ATIVAR KEY
app.post('/api/activate', (req, res) => {
    try {
        const { key } = req.body;
        
        if (!keysDB[key]) {
            return res.status(404).json({
                success: false,
                message: 'Key não encontrada'
            });
        }
        
        keysDB[key].ativo = true;
        
        res.json({
            success: true,
            message: 'Key ativada com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao ativar key'
        });
    }
});

// ROTA RAIZ
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// =============================================
// EXPORTAR PARA VERCEL
// =============================================
module.exports = app;
