const mockRes = {
  devMsg: { id: 'abc123xy', NOME: 'Teste', TIPO: 'cinco', PESOS: '[]' }
};
const idCriado = mockRes.devMsg?.UUID || mockRes.devMsg?.id;
console.log("idCriado:", idCriado);

const db = { criterio: [mockRes.devMsg] };

const mapped = db.criterio.map(c => {
  const critId = c.UUID || c.id;
  const pesos = typeof c.PESOS === 'string' ? JSON.parse(c.PESOS) : (c.PESOS || c.pesos || []);
  return {
    id: critId,
    nome: c.TEXTO || c.nome || c.NOME || '',
    tipo: c.TIPO || c.tipo || c['UUID TIPO'] || 'cinco',
    pesos: pesos,
    editando: false
  };
}).filter(c => c.nome !== '');

console.log("mapped:", mapped);
