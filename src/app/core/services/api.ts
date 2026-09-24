import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

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
    return Math.random().toString(36).substr(2, 9);
  }

  listar<T = any>(rota: string): Observable<ApiResponse<T>> {
    let items = this.db[rota] || [];
    if (rota === 'tarefa' && this.idAutorizacao) {
      items = items.filter(t => t.idUsuario === this.idAutorizacao || t.id_usuario === this.idAutorizacao || t.ID_USUARIO === this.idAutorizacao || t.ID_AUTORIZACAO === this.idAutorizacao || t.idAutorizacao === this.idAutorizacao);
      if (items.length === 0 && (this.db[rota]||[]).length > 0) {
          items = this.db[rota];
      }
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
    
    const newItem = {
      id: this.generateId(),
      ...payload,
      idAutorizacao: this.idAutorizacao
    };
    newItem.ID = newItem.id;
    newItem.UUID = newItem.id;
    
    this.db[rota].push(newItem);
    this.saveDb();

    return of({
      sucesso: true,
      mensagem: 'Criado com sucesso',
      devMsg: newItem as any
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
        devMsg: this.db[rota][index] as any
      });
    }

    return of({
      sucesso: false,
      mensagem: 'Item não encontrado',
    });
  }

  deletar<T = any>(rota: string, id: string): Observable<ApiResponse<T>> {
    if (!this.db[rota]) this.db[rota] = [];
    
    const initialLen = this.db[rota].length;
    this.db[rota] = this.db[rota].filter(item => item.id !== id && item.ID !== id && item.UUID !== id);
    
    if (this.db[rota].length < initialLen) {
      if (rota === 'criterio' && this.db['criterioOpcoes']) {
        this.db['criterioOpcoes'] = this.db['criterioOpcoes'].filter(o => 
          o['UUID CRITERIO'] !== id && o.criterio_id !== id && o.ID_CRITERIO !== id && o['ID CRITERIO'] !== id
        );
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
      const email = params.get('email');
      const senha = params.get('senha');
      
      const usuario = (this.db['usuario'] || []).find(u => u.email === email && u.senha === senha);
      
      if (usuario) {
        return of({
          sucesso: true,
          mensagem: 'Login realizado',
          devMsg: usuario as any
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
        const criterios = this.db['criterio'] || [];
        const opcoes = this.db['criterioOpcoes'] || [];
        
        criterios.forEach(crit => {
          const nomeCrit = crit.NOME || crit.nome;
          let valorSelecionado = tarefas[index][nomeCrit];
          if (valorSelecionado) {
            const critId = crit.UUID || crit.id || crit.ID;
            const opcao = opcoes.find(o => 
              (o['UUID CRITERIO'] === critId || o.criterio_id === critId || o.ID_CRITERIO === critId || o['ID CRITERIO'] === critId) && 
              (String(o.AVALIACAO).trim().toLowerCase() === String(valorSelecionado).trim().toLowerCase() || 
               String(o.avaliacao).trim().toLowerCase() === String(valorSelecionado).trim().toLowerCase() || 
               String(o.TEXTO).trim().toLowerCase() === String(valorSelecionado).trim().toLowerCase() || 
               String(o.texto).trim().toLowerCase() === String(valorSelecionado).trim().toLowerCase() ||
               String(o.PESO).trim() === String(valorSelecionado).trim() ||
               String(o.peso).trim() === String(valorSelecionado).trim())
            );
            if (opcao) {
              pontosCalculados += Number(opcao.PESO || opcao.peso || 0);
            }
          }
        });
        
        if (pontosCalculados === 0) pontosCalculados = payload.pontos || 10;
        
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
