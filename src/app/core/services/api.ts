import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ApiResponse<T = any> {
  sucesso: boolean;
  mensagem: string;
  devMsg?: T;
}

@Injectable({
  providedIn: 'root',
})
export class Api {
  private db: { [rota: string]: any[] } = {};

  constructor() {
    this.initDb();
  }

  private initDb() {
    const saved = localStorage.getItem('mockDb');
    if (saved) {
      try {
        this.db = JSON.parse(saved);
        // Self-healing: remove transient UI state (_isEditing, _loading) that might have been saved
        for (const rota in this.db) {
          if (Array.isArray(this.db[rota])) {
            this.db[rota].forEach((item: any) => {
              if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => {
                  if (key.startsWith('_')) delete item[key];
                });
              }
            });
          }
        }
      } catch (e) {
        this.db = {};
      }
    }
    const rotas = ['usuario', 'tarefa', 'categoria', 'atividade', 'status', 'tipo', 'criterio', 'criterioOpcoes', 'conclusao'];
    rotas.forEach(r => {
      if (!this.db[r]) this.db[r] = [];
    });
    if (!this.db['usuario'].find((u: any) => u.email === 'admin@admin.com')) {
      this.db['usuario'].push({ id: '1', nome: 'Admin Silva', email: 'admin@admin.com', senha: '123', idAcesso: 'Admin' });
    }
    if (this.db['status'].length <= 3) {
      const padroes = [
        { id: 'st-1', ID: 'st-1', UUID: 'st-1', nome: 'Pendente', NOME: 'Pendente' },
        { id: 'st-2', ID: 'st-2', UUID: 'st-2', nome: 'Em Andamento', NOME: 'Em Andamento' },
        { id: 'st-3', ID: 'st-3', UUID: 'st-3', nome: 'Em Revisão', NOME: 'Em Revisão' },
        { id: 'st-4', ID: 'st-4', UUID: 'st-4', nome: 'Concluída', NOME: 'Concluída' },
        { id: 'st-5', ID: 'st-5', UUID: 'st-5', nome: 'Bloqueada', NOME: 'Bloqueada' },
        { id: 'st-6', ID: 'st-6', UUID: 'st-6', nome: 'Urgente', NOME: 'Urgente' }
      ];
      padroes.forEach(p => {
        if (!this.db['status'].some((s: any) => (s.NOME || s.nome) === p.nome)) {
          this.db['status'].push(p);
        }
      });
    }
    this.saveDb();
  }

  private saveDb() {
    try {
      localStorage.setItem('mockDb', JSON.stringify(this.db));
    } catch (e) {}
  }

  private get idAutorizacao(): string {
    return localStorage.getItem('usuarioId') || '';
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private isOwnedByCurrentUser(item: any): boolean {
    const authId = this.idAutorizacao;
    if (!authId) return true;
    const ownerId = item.idUsuario || item.id_usuario || item.ID_USUARIO || item.ID_AUTORIZACAO || item.idAutorizacao;
    // Se o item não tiver dono vinculado (dados globais/seeds), permite visualização; caso contrário, exige match estrito
    return !ownerId || String(ownerId) === String(authId);
  }

  listar<T = any>(rota: string): Observable<ApiResponse<T>> {
    let items = this.db[rota] || [];
    const rotasIsoladas = ['tarefa', 'conclusao', 'criterio', 'categoria', 'atividade'];
    if (rotasIsoladas.includes(rota) && this.idAutorizacao) {
      items = items.filter(item => this.isOwnedByCurrentUser(item));
    }
    const clonedItems = JSON.parse(JSON.stringify(items));
    return of({
      sucesso: true,
      mensagem: 'Sucesso',
      devMsg: clonedItems as any
    });
  }

  criar<T = any>(rota: string, payload: any): Observable<ApiResponse<T>> {
    if (!this.db[rota]) this.db[rota] = [];

    if (rota === 'usuario' && payload.email) {
      const emailNorm = String(payload.email).trim().toLowerCase();
      const jaExiste = this.db['usuario'].some(u => String(u.email || '').trim().toLowerCase() === emailNorm);
      if (jaExiste) {
        return of({
          sucesso: false,
          mensagem: 'Este e-mail já está cadastrado!'
        });
      }
    }
    
    const newItem: any = {
      id: this.generateId(),
      ...payload,
      idAutorizacao: this.idAutorizacao
    };
    newItem.ID = newItem.id;
    newItem.UUID = newItem.id;
    if (newItem.nome && !newItem.NOME) newItem.NOME = newItem.nome;
    if (newItem.NOME && !newItem.nome) newItem.nome = newItem.NOME;
    
    this.db[rota].push(newItem);
    this.saveDb();

    return of({
      sucesso: true,
      mensagem: 'Criado com sucesso',
      devMsg: JSON.parse(JSON.stringify(newItem)) as any
    });
  }

  atualizar<T = any>(rota: string, id: string, payload: any): Observable<ApiResponse<T>> {
    if (!this.db[rota]) this.db[rota] = [];
    
    const index = this.db[rota].findIndex(item => item.id === id || item.ID === id || item.UUID === id);
    if (index >= 0) {
      let updatePayload = { ...payload };
      if (payload.cabecalhos && payload.modificacoes) {
        payload.cabecalhos.forEach((cabecalho: string, i: number) => {
          updatePayload[cabecalho] = payload.modificacoes[i];
        });
        delete updatePayload.cabecalhos;
        delete updatePayload.modificacoes;
      }
      this.db[rota][index] = { ...this.db[rota][index], ...updatePayload };
      this.saveDb();
      return of({
        sucesso: true,
        mensagem: 'Atualizado com sucesso',
        devMsg: JSON.parse(JSON.stringify(this.db[rota][index])) as any
      });
    }

    return of({
      sucesso: false,
      mensagem: 'Item não encontrado',
    });
  }

  private recalcularPontosTarefa(tarefa: any): number {
    let pontosCalculados = 0;
    const criterios = (this.db['criterio'] || []).filter(c => this.isOwnedByCurrentUser(c));
    const opcoes = this.db['criterioOpcoes'] || [];

    criterios.forEach(crit => {
      const nomeCrit = crit.NOME || crit.nome || crit.TEXTO;
      const valorSelecionado = tarefa[nomeCrit];
      if (valorSelecionado !== undefined && valorSelecionado !== null && String(valorSelecionado).trim() !== '') {
        const critId = crit.UUID || crit.id || crit.ID;
        const valNorm = String(valorSelecionado).trim().toLowerCase();
        const opcao = opcoes.find(o =>
          (o['UUID CRITERIO'] === critId || o.criterio_id === critId || o.ID_CRITERIO === critId || o['ID CRITERIO'] === critId) &&
          (String(o.AVALIACAO ?? '').trim().toLowerCase() === valNorm ||
           String(o.avaliacao ?? '').trim().toLowerCase() === valNorm ||
           String(o.TEXTO ?? '').trim().toLowerCase() === valNorm ||
           String(o.texto ?? '').trim().toLowerCase() === valNorm ||
           String(o.PESO ?? '').trim().toLowerCase() === valNorm ||
           String(o.peso ?? '').trim().toLowerCase() === valNorm)
        );
        if (opcao) {
          const pesoNum = Number(opcao.PESO ?? opcao.peso ?? 0);
          if (!isNaN(pesoNum)) {
            pontosCalculados += pesoNum;
          }
        } else {
          let pesosEmbutidos: any[] = [];
          try {
            pesosEmbutidos = typeof crit.PESOS === 'string' ? JSON.parse(crit.PESOS) : (crit.PESOS || crit.pesos || []);
          } catch {}
          if (Array.isArray(pesosEmbutidos)) {
            const pEmb = pesosEmbutidos.find(p =>
              String(p.aval ?? '').trim().toLowerCase() === valNorm ||
              String(p.peso ?? '').trim().toLowerCase() === valNorm
            );
            if (pEmb) {
              const pesoNum = Number(pEmb.peso ?? 0);
              if (!isNaN(pesoNum)) {
                pontosCalculados += pesoNum;
              }
            }
          }
        }
      }
    });

    return Number(pontosCalculados.toFixed(2));
  }

  private sincronizarConclusoesDeTarefas() {
    if (!Array.isArray(this.db['conclusao']) || !Array.isArray(this.db['tarefa'])) return;
    this.db['conclusao'].forEach(c => {
      if (c.ativo !== false && c.ATIVO !== false) {
        const idT = c.idTarefa || c.ID_TAREFA;
        const tarefa = this.db['tarefa'].find(t => t.id === idT || t.ID === idT || t.UUID === idT);
        if (tarefa) {
          const novosPontos = this.recalcularPontosTarefa(tarefa);
          c.pontos = novosPontos;
          c.PONTOS = novosPontos;
        }
      }
    });
  }

  deletarCategoriaComOpcao(idOuNome: string, excluirTarefasJunto: boolean): Observable<ApiResponse<any>> {
    if (!this.db['categoria']) this.db['categoria'] = [];
    const norm = String(idOuNome || '').trim().toLowerCase();
    const catAlvo = this.db['categoria'].find(c =>
      String(c.id || c.ID || c.UUID || '').toLowerCase() === norm ||
      String(c.NOME || c.nome || '').trim().toLowerCase() === norm
    );

    const nomeCat = catAlvo ? String(catAlvo.NOME || catAlvo.nome || '') : String(idOuNome || '');
    const nomeNorm = nomeCat.trim().toLowerCase();

    this.db['categoria'] = this.db['categoria'].filter(c =>
      String(c.id || c.ID || c.UUID || '').toLowerCase() !== norm &&
      String(c.NOME || c.nome || '').trim().toLowerCase() !== nomeNorm
    );

    if (Array.isArray(this.db['tarefa'])) {
      if (excluirTarefasJunto) {
        const idsTarefasRemovidas = new Set<string>();
        this.db['tarefa'] = this.db['tarefa'].filter(t => {
          const tCat = String(t.CATEGORIA || t.categoria || t['UUID CATEGORIA'] || '').trim().toLowerCase();
          if (tCat === nomeNorm) {
            const tid = String(t.id || t.ID || t.UUID || '');
            if (tid) idsTarefasRemovidas.add(tid);
            return false;
          }
          return true;
        });
        if (Array.isArray(this.db['conclusao']) && idsTarefasRemovidas.size > 0) {
          this.db['conclusao'] = this.db['conclusao'].filter(
            c => !idsTarefasRemovidas.has(String(c.idTarefa || c.ID_TAREFA || ''))
          );
        }
      } else {
        this.db['tarefa'].forEach(t => {
          const tCat = String(t.CATEGORIA || t.categoria || '').trim().toLowerCase();
          if (tCat === nomeNorm) {
            t.CATEGORIA = '';
            if (t.categoria !== undefined) t.categoria = '';
          }
        });
      }
    }

    this.saveDb();
    return of({
      sucesso: true,
      mensagem: excluirTarefasJunto
        ? 'Categoria e suas tarefas foram excluídas!'
        : 'Categoria excluída (as tarefas foram mantidas sem categoria)!'
    });
  }

  deletarCriterioComOpcao(id: string, removerColunaDasTarefas: boolean): Observable<ApiResponse<any>> {
    if (!this.db['criterio']) this.db['criterio'] = [];
    const itemAlvo = this.db['criterio'].find(item => item.id === id || item.ID === id || item.UUID === id);
    if (!itemAlvo) {
      return of({ sucesso: false, mensagem: 'Critério não encontrado' });
    }

    const nomeCriterioDeletado = itemAlvo.NOME || itemAlvo.nome || itemAlvo.TEXTO || '';
    this.db['criterio'] = this.db['criterio'].filter(item => item.id !== id && item.ID !== id && item.UUID !== id);

    if (this.db['criterioOpcoes']) {
      this.db['criterioOpcoes'] = this.db['criterioOpcoes'].filter(o =>
        o['UUID CRITERIO'] !== id && o.criterio_id !== id && o.ID_CRITERIO !== id && o['ID CRITERIO'] !== id
      );
    }

    if (removerColunaDasTarefas) {
      if (nomeCriterioDeletado && Array.isArray(this.db['tarefa'])) {
        this.db['tarefa'].forEach(t => {
          delete t[nomeCriterioDeletado];
        });
      }
      try {
        const ativosRaw = localStorage.getItem('criteriosAtivos_lista');
        if (ativosRaw) {
          const ativos = JSON.parse(ativosRaw);
          if (Array.isArray(ativos)) {
            const filtrados = ativos.filter((ca: any) => ca.id !== id && ca.nome !== nomeCriterioDeletado);
            localStorage.setItem('criteriosAtivos_lista', JSON.stringify(filtrados));
          }
        }
      } catch {}
    }

    this.sincronizarConclusoesDeTarefas();
    this.saveDb();

    return of({
      sucesso: true,
      mensagem: removerColunaDasTarefas
        ? 'Critério excluído e coluna removida de todas as tarefas!'
        : 'Critério excluído do catálogo!'
    });
  }

  deletar<T = any>(rota: string, id: string): Observable<ApiResponse<T>> {
    if (!this.db[rota]) this.db[rota] = [];
    
    const itemAlvo = this.db[rota].find(item => item.id === id || item.ID === id || item.UUID === id);
    const initialLen = this.db[rota].length;
    this.db[rota] = this.db[rota].filter(item => item.id !== id && item.ID !== id && item.UUID === undefined ? true : (item.id !== id && item.ID !== id && item.UUID !== id));
    
    if (this.db[rota].length < initialLen) {
      if (rota === 'criterio') {
        const nomeCriterioDeletado = itemAlvo ? (itemAlvo.NOME || itemAlvo.nome || itemAlvo.TEXTO || '') : '';
        if (this.db['criterioOpcoes']) {
          this.db['criterioOpcoes'] = this.db['criterioOpcoes'].filter(o => 
            o['UUID CRITERIO'] !== id && o.criterio_id !== id && o.ID_CRITERIO !== id && o['ID CRITERIO'] !== id
          );
        }
        if (nomeCriterioDeletado && Array.isArray(this.db['tarefa'])) {
          this.db['tarefa'].forEach(t => {
            delete t[nomeCriterioDeletado];
          });
        }
        try {
          const ativosRaw = localStorage.getItem('criteriosAtivos_lista');
          if (ativosRaw) {
            const ativos = JSON.parse(ativosRaw);
            if (Array.isArray(ativos)) {
              const filtrados = ativos.filter((ca: any) => ca.id !== id && ca.nome !== nomeCriterioDeletado);
              localStorage.setItem('criteriosAtivos_lista', JSON.stringify(filtrados));
            }
          }
        } catch {}
        this.sincronizarConclusoesDeTarefas();
      }
      if (rota === 'criterioOpcoes') {
        this.sincronizarConclusoesDeTarefas();
      }
      if (rota === 'tarefa' && this.db['conclusao']) {
        this.db['conclusao'] = this.db['conclusao'].filter(c => c.idTarefa !== id && c.ID_TAREFA !== id);
      }

      this.saveDb();
      return of({
        sucesso: true,
        mensagem: 'Deletado com sucesso',
      });
    }

    return of({
      sucesso: false,
      mensagem: 'Item não encontrado',
    });
  }

  getCustom<T = any>(queryString: string): Observable<ApiResponse<T>> {
    const params = new URLSearchParams(queryString);
    const action = params.get('action');

    if (action === 'login') {
      const email = (params.get('email') || '').trim().toLowerCase();
      const senha = params.get('senha') || '';
      
      const usuario = (this.db['usuario'] || []).find(
        u => String(u.email || '').trim().toLowerCase() === email && String(u.senha || '') === senha
      );
      
      if (usuario) {
        const safeUser = { ...usuario };
        delete safeUser.senha;
        return of({
          sucesso: true,
          mensagem: 'Login realizado',
          devMsg: safeUser as any
        });
      } else {
        return of({
          sucesso: false,
          mensagem: 'E-mail ou senha incorretos'
        });
      }
    }

    return of({ sucesso: true, mensagem: 'Não implementado', devMsg: [] as any });
  }

  postCustom<T = any>(payload: any): Observable<ApiResponse<T>> {
    if (payload.action === 'conclusao') {
      const id = payload.idTarefa;
      const tarefas = this.db['tarefa'] || [];
      const index = tarefas.findIndex(t => t.id === id || t.ID === id || t.UUID === id);
      if (index >= 0) {
        const concluida = !tarefas[index].CONCLUIDA;
        tarefas[index].CONCLUIDA = concluida;
        
        let pontosCalculados = 0;
        let teveCriterioAvaliado = false;
        const criterios = (this.db['criterio'] || []).filter(c => this.isOwnedByCurrentUser(c));
        const opcoes = this.db['criterioOpcoes'] || [];
        
        criterios.forEach(crit => {
          const nomeCrit = crit.NOME || crit.nome;
          const valorSelecionado = tarefas[index][nomeCrit];
          if (valorSelecionado !== undefined && valorSelecionado !== null && String(valorSelecionado).trim() !== '') {
            const critId = crit.UUID || crit.id || crit.ID;
            const valNorm = String(valorSelecionado).trim().toLowerCase();
            const opcao = opcoes.find(o => 
              (o['UUID CRITERIO'] === critId || o.criterio_id === critId || o.ID_CRITERIO === critId || o['ID CRITERIO'] === critId) && 
              (String(o.AVALIACAO ?? '').trim().toLowerCase() === valNorm || 
               String(o.avaliacao ?? '').trim().toLowerCase() === valNorm || 
               String(o.TEXTO ?? '').trim().toLowerCase() === valNorm || 
               String(o.texto ?? '').trim().toLowerCase() === valNorm ||
               String(o.PESO ?? '').trim().toLowerCase() === valNorm ||
               String(o.peso ?? '').trim().toLowerCase() === valNorm)
            );
            if (opcao) {
              teveCriterioAvaliado = true;
              const pesoNum = Number(opcao.PESO ?? opcao.peso ?? 0);
              if (!isNaN(pesoNum)) {
                pontosCalculados += pesoNum;
              }
            }
          }
        });
        
        if (!teveCriterioAvaliado) {
          pontosCalculados = payload.pontos ?? 0;
        }
        
        if (!this.db['conclusao']) this.db['conclusao'] = [];
        
        // Sempre desativar as conclusões anteriores ativas dessa tarefa para evitar duplicação de pontos
        this.db['conclusao'].forEach(c => {
          if (c.idTarefa === id || c.ID_TAREFA === id) {
            c.ativo = false;
            c.ATIVO = false;
          }
        });

        if (concluida) {
          this.db['conclusao'].push({
            id: this.generateId(),
            idTarefa: id,
            pontos: pontosCalculados,
            horario: new Date().toISOString(),
            idAutorizacao: this.idAutorizacao,
            ativo: true
          });
        }
        
        this.saveDb();
        return of({ sucesso: true, mensagem: 'Status atualizado' });
      }
    }
    return of({ sucesso: true, mensagem: 'Operação realizada' });
  }
}
