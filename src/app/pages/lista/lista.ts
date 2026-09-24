import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CheckSquare, Pencil, List, Clock, ShieldAlert, Plus, X, Check, Trash2, Save } from 'lucide-angular';
import { Api } from '../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './lista.html',
  styleUrl: './lista.css',
})
export class Lista implements OnInit {
  readonly CheckSquare = CheckSquare;
  readonly Pencil = Pencil;
  readonly ListIcon = List;
  readonly Clock = Clock;
  readonly ShieldAlert = ShieldAlert;
  readonly Plus = Plus;
  readonly X = X;
  readonly Check = Check;
  readonly Trash2 = Trash2;
  readonly Save = Save;

  tarefas: any[] = [];
  categorias: any[] = [];
  atividades: any[] = [];
  statusList: any[] = [];
  
  criteriosSalvos: any[] = [];
  criteriosAtivos: any[] = [];

  carregando = false;
  mostrarModal = false;
  mostrarModalCriterio = false;
  criterioSelecionado = '';
  
  novaTarefa = {
    nomeStatus: '',
    nomeAtividade: '',
    nomeCategoria: '',
    dataComeco: '',
    dataFim: ''
  };

  filtroCategoria = '';
  novaCategoriaNome = '';

  filtroStatus = '';
  filtroAtividade = '';
  filtrosCriterios: any = {};
  
  colunaOrdenacao = '';
  ordemOrdenacao = 1;

  ordenar(coluna: string) {
    if (this.colunaOrdenacao === coluna) {
      this.ordemOrdenacao *= -1;
    } else {
      this.colunaOrdenacao = coluna;
      this.ordemOrdenacao = 1;
    }
  }

  get tarefasFiltradas() {
    let result = this.tarefas;

    if (this.filtroCategoria && this.filtroCategoria !== '_NOVA_') {
      result = result.filter(t => (t.CATEGORIA || t.categoria) === this.filtroCategoria);
    }
    
    if (this.filtroStatus) {
      result = result.filter(t => (t.STATUS || t.status) === this.filtroStatus);
    }

    if (this.filtroAtividade) {
      result = result.filter(t => {
        const val = String(t.ATIVIDADE || t.atividade || t.TEXTO || t.texto || '').toLowerCase();
        return val.includes(this.filtroAtividade.toLowerCase());
      });
    }

    for (const crit of this.criteriosAtivos) {
      if (this.filtrosCriterios[crit.nome]) {
        result = result.filter(t => String(t[crit.nome] || '') === String(this.filtrosCriterios[crit.nome]));
      }
    }

    if (this.colunaOrdenacao) {
      result = result.slice().sort((a, b) => {
        let valA = a[this.colunaOrdenacao] || a[this.colunaOrdenacao.toLowerCase()] || '';
        let valB = b[this.colunaOrdenacao] || b[this.colunaOrdenacao.toLowerCase()] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return -1 * this.ordemOrdenacao;
        if (valA > valB) return 1 * this.ordemOrdenacao;
        return 0;
      });
    }

    return result;
  }

  constructor(private api: Api) {}

  ngOnInit() {
    this.carregarDados();
    const salvos = localStorage.getItem('criteriosAtivos_lista');
    if (salvos) {
      try {
        this.criteriosAtivos = JSON.parse(salvos);
      } catch (e) {}
    }
  }

  carregarDados() {
    this.carregando = true;
    
    forkJoin({
      tarefas: this.api.listar<any[]>('tarefa'),
      categorias: this.api.listar<any[]>('categoria'),
      atividades: this.api.listar<any[]>('atividade'),
      status: this.api.listar<any[]>('status'),
      criterios: this.api.listar<any[]>('criterio'),
      opcoes: this.api.listar<any[]>('criterioOpcoes').pipe(catchError(() => of({ sucesso: true, devMsg: [] })))
    }).subscribe(({ tarefas, categorias, atividades, status, criterios, opcoes }) => {
      this.carregando = false;
      if (tarefas.sucesso) this.tarefas = tarefas.devMsg || [];
      if (categorias.sucesso) this.categorias = categorias.devMsg || [];
      if (atividades.sucesso) this.atividades = atividades.devMsg || [];
      if (status.sucesso) this.statusList = status.devMsg || [];

      if (criterios.sucesso && Array.isArray(criterios.devMsg)) {
        const opcoesList = (opcoes.sucesso && Array.isArray(opcoes.devMsg)) ? opcoes.devMsg : [];
        this.criteriosSalvos = criterios.devMsg.map((c: any) => {
          const critId = c.UUID || c.id;
          const critOpcoes = opcoesList.filter((o: any) => 
            o['UUID CRITERIO'] === critId || o.criterio_id === critId || o.ID_CRITERIO === critId || o['ID CRITERIO'] === critId
          );
          let pesos = [];
          if (critOpcoes.length > 0) {
            pesos = critOpcoes.map((o: any) => ({
              id: o.UUID || o.id,
              peso: (o.PESO !== undefined && o.PESO !== null) ? o.PESO : ((o.peso !== undefined && o.peso !== null) ? o.peso : 0),
              aval: o.AVALIACAO || o.avaliacao || o.TEXTO || o.texto || o.AVAL || o.aval || ''
            }));
          } else {
            pesos = typeof c.PESOS === 'string' ? JSON.parse(c.PESOS) : (c.PESOS || c.pesos || []);
          }
          return {
            id: critId,
            nome: c.TEXTO || c.nome || c.NOME || '',
            pesos: pesos
          };
        }).filter((c: any) => c.nome !== '');
        
        // Sync active criteria with loaded ones to keep weights up-to-date
        this.criteriosAtivos = this.criteriosAtivos.map(ca => {
          const updated = this.criteriosSalvos.find(c => c.id === ca.id);
          return updated ? updated : ca;
        });
      }
    }, () => this.carregando = false);
  }

  getGridColumns() {
    const fixedCols = 6;
    const critCols = this.criteriosAtivos.length;
    return `repeat(${fixedCols + critCols}, 1fr) minmax(140px, auto)`;
  }

  onFiltroCategoriaChange() {
    if (this.filtroCategoria === '_NOVA_') {
      this.novaCategoriaNome = '';
    }
  }

  salvarNovaCategoria() {
    const nome = this.novaCategoriaNome.trim();
    if (!nome) {
      this.filtroCategoria = '';
      return;
    }
    if (!this.categorias.find(c => c.NOME === nome)) {
      this.api.criar('categoria', { nome: nome }).subscribe(res => {
        if (res.sucesso) {
          this.categorias.push({ NOME: nome });
          this.filtroCategoria = nome;
        } else {
          alert(res.mensagem || 'Erro ao criar categoria');
          this.filtroCategoria = '';
        }
      }, () => {
        alert('Erro ao comunicar com a API');
        this.filtroCategoria = '';
      });
    } else {
      this.filtroCategoria = nome;
    }
  }

  cancelarNovaCategoria() {
    this.filtroCategoria = '';
    this.novaCategoriaNome = '';
  }

  abrirModal() {
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.novaTarefa = { nomeStatus: '', nomeAtividade: '', nomeCategoria: '', dataComeco: '', dataFim: '' };
  }

  abrirModalCriterio() {
    this.mostrarModalCriterio = true;
  }

  fecharModalCriterio() {
    this.mostrarModalCriterio = false;
    this.criterioSelecionado = '';
  }

  adicionarColunaCriterio() {
    if (!this.criterioSelecionado) return;
    const crit = this.criteriosSalvos.find(c => c.id === this.criterioSelecionado);
    if (crit && !this.criteriosAtivos.find(ca => ca.id === crit.id)) {
      this.criteriosAtivos.push(crit);
      localStorage.setItem('criteriosAtivos_lista', JSON.stringify(this.criteriosAtivos));
    }
    this.fecharModalCriterio();
  }

  removerColunaCriterio(critId: string) {
    this.criteriosAtivos = this.criteriosAtivos.filter(c => c.id !== critId);
    localStorage.setItem('criteriosAtivos_lista', JSON.stringify(this.criteriosAtivos));
  }

  salvarTarefa() {
    if (!this.novaTarefa.nomeAtividade) {
      alert('Digite o texto da tarefa.');
      return;
    }

    const nomeAtividade = this.novaTarefa.nomeAtividade;
    if (!this.atividades.find(a => a.NOME === nomeAtividade)) {
      this.api.criar('atividade', { nome: nomeAtividade }).subscribe(res => {
        if (res.sucesso) this.atividades.push({ NOME: nomeAtividade });
      });
    }

    if (this.filtroCategoria && this.filtroCategoria !== '_NOVA_') {
      this.novaTarefa.nomeCategoria = this.filtroCategoria;
    }

    this.carregando = true;
    const payload = {
      ATIVIDADE: this.novaTarefa.nomeAtividade,
      CATEGORIA: this.novaTarefa.nomeCategoria,
      STATUS: this.novaTarefa.nomeStatus,
      DATA_COMECO: this.novaTarefa.dataComeco,
      DATA_FIM: this.novaTarefa.dataFim,
      CONCLUIDA: false
    };

    this.api.criar('tarefa', payload).subscribe(res => {
      if (res.sucesso) {
        this.fecharModal();
        this.carregarDados();
      } else {
        alert(res.mensagem);
        this.carregando = false;
      }
    }, () => {
      alert('Erro ao salvar a tarefa.');
      this.carregando = false;
    });
  }

  concluirTarefa(tarefa: any) {
    const id = tarefa.ID || tarefa.id || tarefa.id_tarefa;
    if (!id) return;
    
    tarefa._loading = true;
    
    const payload = {
      action: 'conclusao',
      idTarefa: id,
      pontos: 10,
      idAutorizacao: localStorage.getItem('usuarioId') || ''
    };

    this.api.postCustom(payload).subscribe(res => {
      if (res.sucesso) {
        tarefa.CONCLUIDA = !tarefa.CONCLUIDA;
      } else {
        alert(res.mensagem);
      }
      tarefa._loading = false;
    }, () => {
      alert('Erro ao marcar conclusão.');
      tarefa._loading = false;
    });
  }

  editarTarefa(t: any) {
    t._original = { ...t };
    t._isEditing = true;
  }

  cancelarEdicao(t: any) {
    Object.assign(t, t._original);
    t._isEditing = false;
  }

  salvarEdicao(t: any) {
    const id = t.ID || t.id || t.id_tarefa;
    if (!id) return;

    const modifiedFields = [];
    const modifiedValues = [];

    const fixedFields = ['CATEGORIA', 'ATIVIDADE', 'STATUS', 'DATA_COMECO', 'DATA_FIM'];
    for (const f of fixedFields) {
      if (t[f] !== t._original[f]) {
        modifiedFields.push(f);
        modifiedValues.push(t[f]);
      }
    }
    
    for (const crit of this.criteriosAtivos) {
      if (t[crit.nome] !== t._original[crit.nome]) {
        modifiedFields.push(crit.nome);
        modifiedValues.push(t[crit.nome]);
      }
    }

    if (modifiedFields.length === 0) {
      t._isEditing = false;
      return;
    }

    if (modifiedFields.includes('CATEGORIA') && t.CATEGORIA && !this.categorias.find(c => c.NOME === t.CATEGORIA)) {
      this.api.criar('categoria', { nome: t.CATEGORIA }).subscribe(res => { if(res.sucesso) this.categorias.push({ NOME: t.CATEGORIA }); });
    }
    if (modifiedFields.includes('ATIVIDADE') && t.ATIVIDADE && !this.atividades.find(a => a.NOME === t.ATIVIDADE)) {
      this.api.criar('atividade', { nome: t.ATIVIDADE }).subscribe(res => { if(res.sucesso) this.atividades.push({ NOME: t.ATIVIDADE }); });
    }
    if (modifiedFields.includes('STATUS') && t.STATUS && !this.statusList.find(s => s.NOME === t.STATUS)) {
      this.api.criar('status', { nome: t.STATUS }).subscribe(res => { if(res.sucesso) this.statusList.push({ NOME: t.STATUS }); });
    }

    t._loading = true;
    
    this.api.atualizar('tarefa', id, {
      cabecalhos: modifiedFields,
      modificacoes: modifiedValues
    }).subscribe(res => {
      t._loading = false;
      if (res.sucesso) {
        t._isEditing = false;
      } else {
        alert(res.mensagem);
      }
    }, () => {
      t._loading = false;
      alert('Erro ao salvar edição.');
    });
  }

  deletarTarefa(tarefa: any) {
    if (!confirm('Deseja realmente remover esta tarefa?')) return;
    
    const id = tarefa.ID || tarefa.id || tarefa.id_tarefa;
    if (!id) return;
    
    tarefa._loading = true;
    this.api.deletar('tarefa', id).subscribe(res => {
      if (res.sucesso) {
        this.carregarDados();
      } else {
        alert(res.mensagem);
        tarefa._loading = false;
      }
    }, () => {
      alert('Erro ao remover tarefa.');
      tarefa._loading = false;
    });
  }
}
