import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule, CheckSquare, Pencil, List, Clock, ShieldAlert, Plus, X, Check, Trash2, Save, Calculator } from 'lucide-angular';
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
  readonly Calculator = Calculator;

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
      result = result.filter(t => t._isNew || (t.CATEGORIA || t.categoria) === this.filtroCategoria);
    }
    
    if (this.filtroStatus) {
      result = result.filter(t => t._isNew || (t.STATUS || t.status) === this.filtroStatus);
    }

    if (this.filtroAtividade) {
      result = result.filter(t => {
        if (t._isNew) return true;
        const val = String(t.ATIVIDADE || t.atividade || t.TEXTO || t.texto || '').toLowerCase();
        return val.includes(this.filtroAtividade.toLowerCase());
      });
    }

    for (const crit of this.criteriosAtivos) {
      if (this.filtrosCriterios[crit.nome]) {
        result = result.filter(t => t._isNew || String(t[crit.nome] || '') === String(this.filtrosCriterios[crit.nome]));
      }
    }

    if (this.colunaOrdenacao) {
      result = result.slice().sort((a, b) => {
        if (a._isNew) return -1;
        if (b._isNew) return 1;
        if (this.colunaOrdenacao === 'SOMA') {
          const sumA = this.calcularSomaTarefa(a);
          const sumB = this.calcularSomaTarefa(b);
          return (sumA - sumB) * this.ordemOrdenacao;
        }
        let valA = a[this.colunaOrdenacao] ?? a[this.colunaOrdenacao.toLowerCase()] ?? '';
        let valB = b[this.colunaOrdenacao] ?? b[this.colunaOrdenacao.toLowerCase()] ?? '';
        if (typeof valA === 'boolean' || typeof valB === 'boolean') {
          valA = valA ? 1 : 0;
          valB = valB ? 1 : 0;
        } else {
          const numA = Number(valA);
          const numB = Number(valB);
          if (valA !== '' && valB !== '' && !isNaN(numA) && !isNaN(numB)) {
            valA = numA;
            valB = numB;
          } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
          }
        }
        if (valA < valB) return -1 * this.ordemOrdenacao;
        if (valA > valB) return 1 * this.ordemOrdenacao;
        return 0;
      });
    }

    return result;
  }

  constructor(private api: Api, private route: ActivatedRoute) {}

  ngOnInit() {
    const salvos = localStorage.getItem('criteriosAtivos_lista');
    if (salvos) {
      try {
        this.criteriosAtivos = JSON.parse(salvos);
      } catch (e) {}
    }
    this.carregarDados();
    if (this.route.snapshot.queryParamMap.get('novo') === '1' || window.location.href.includes('novo=1')) {
      this.iniciarNovaTarefa();
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
      const rascunhoAtual = this.tarefaEmCriacao;
      if (tarefas.sucesso) {
        this.tarefas = tarefas.devMsg || [];
        if (rascunhoAtual) {
          this.tarefas.unshift(rascunhoAtual);
        }
      }
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
            try {
              pesos = typeof c.PESOS === 'string' ? JSON.parse(c.PESOS) : (c.PESOS || c.pesos || []);
              if (!Array.isArray(pesos)) pesos = [];
            } catch {
              pesos = [];
            }
          }
          return {
            id: critId,
            nome: c.TEXTO || c.nome || c.NOME || '',
            pesos: pesos
          };
        }).filter((c: any) => c.nome !== '');
        
        // Sync active criteria with loaded ones (preserving columns whose criterion was kept on tasks)
        this.criteriosAtivos = this.criteriosAtivos
          .map(ca => this.criteriosSalvos.find(c => c.id === ca.id) || this.criteriosSalvos.find(c => c.nome === ca.nome) || ca)
          .filter(Boolean);
        localStorage.setItem('criteriosAtivos_lista', JSON.stringify(this.criteriosAtivos));
      }
    }, () => this.carregando = false);
  }

  calcularSomaTarefa(t: any): number {
    if (!t) return 0;
    const fonteCriterios = this.criteriosAtivos;
    let soma = 0;

    for (const crit of fonteCriterios) {
      const val = t[crit.nome];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const valNorm = String(val).trim().toLowerCase();
        const op = (crit.pesos || []).find((p: any) =>
          (p.aval !== undefined && p.aval !== '' && String(p.aval).trim().toLowerCase() === valNorm) ||
          String(p.peso).trim().toLowerCase() === valNorm
        );
        if (op) {
          const numPeso = Number(op.peso);
          if (!isNaN(numPeso)) {
            soma += numPeso;
          }
        }
      }
    }

    return Number(soma.toFixed(2));
  }

  getGridColumns() {
    const critCols = this.criteriosAtivos.length;
    const critPart = critCols > 0 ? ` repeat(${critCols}, minmax(122px, 0.95fr))` : '';
    return `78px minmax(140px, 1.2fr) minmax(175px, 1.8fr) 136px 136px minmax(120px, 1fr)${critPart} 82px 108px`;
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
    const jaExiste = this.categorias.find(c => String(c.NOME || c.nome || '').toLowerCase() === nome.toLowerCase());
    if (!jaExiste) {
      this.api.criar('categoria', { nome: nome, NOME: nome }).subscribe({
        next: (res) => {
          if (res.sucesso) {
            this.categorias.push({ NOME: nome, nome: nome });
            this.filtroCategoria = nome;
          } else {
            alert(res.mensagem || 'Erro ao criar categoria');
            this.filtroCategoria = '';
          }
        },
        error: () => {
          alert('Erro ao comunicar com a API');
          this.filtroCategoria = '';
        }
      });
    } else {
      this.filtroCategoria = jaExiste.NOME || jaExiste.nome;
    }
  }

  cancelarNovaCategoria() {
    this.filtroCategoria = '';
    this.novaCategoriaNome = '';
  }

  mostrarModalExcluirCategoria = false;
  categoriaParaExcluir = '';

  get qtdTarefasNaCategoriaParaExcluir(): number {
    if (!this.categoriaParaExcluir) return 0;
    const norm = this.categoriaParaExcluir.trim().toLowerCase();
    return this.tarefas.filter(t => !t._isNew && String(t.CATEGORIA || t.categoria || '').trim().toLowerCase() === norm).length;
  }

  abrirModalExcluirCategoria() {
    if (this.filtroCategoria && this.filtroCategoria !== '_NOVA_') {
      this.categoriaParaExcluir = this.filtroCategoria;
    } else if (this.categorias.length > 0) {
      this.categoriaParaExcluir = this.categorias[0].NOME || this.categorias[0].nome;
    } else {
      this.categoriaParaExcluir = '';
    }
    this.mostrarModalExcluirCategoria = true;
  }

  fecharModalExcluirCategoria() {
    this.mostrarModalExcluirCategoria = false;
    this.categoriaParaExcluir = '';
  }

  confirmarExclusaoCategoria(excluirTarefasJunto: boolean) {
    if (!this.categoriaParaExcluir) return;
    const catAlvo = this.categoriaParaExcluir;
    this.carregando = true;
    this.api.deletarCategoriaComOpcao(catAlvo, excluirTarefasJunto).subscribe({
      next: () => {
        if (this.filtroCategoria === catAlvo) {
          this.filtroCategoria = '';
        }
        this.fecharModalExcluirCategoria();
        this.carregarDados();
      },
      error: () => {
        this.carregando = false;
        alert('Erro ao excluir categoria.');
      }
    });
  }

  getStatusColorClass(status: string): string {
    const s = String(status || '').trim().toLowerCase();
    if (!s) return 'status-color-default';
    if (s.includes('concluíd') || s.includes('concluid') || s.includes('finaliz') || s.includes('pront') || s.includes('feit')) {
      return 'status-color-emerald';
    }
    if (s.includes('andamento') || s.includes('progresso') || s.includes('iniciad') || s.includes('fazendo')) {
      return 'status-color-blue';
    }
    if (s.includes('revis') || s.includes('test') || s.includes('homolog') || s.includes('análise') || s.includes('analise')) {
      return 'status-color-purple';
    }
    if (s.includes('bloquead') || s.includes('urgent') || s.includes('atrasad') || s.includes('crític') || s.includes('critic') || s.includes('cancelad') || s.includes('impedid')) {
      return 'status-color-red';
    }
    if (s.includes('pendent') || s.includes('aguard') || s.includes('fila') || s.includes('planejad')) {
      return 'status-color-amber';
    }
    return 'status-color-teal';
  }

  rascunhoNovaTarefa: any = null;

  get tarefaEmCriacao(): any | null {
    return this.rascunhoNovaTarefa;
  }

  iniciarNovaTarefa() {
    if (this.rascunhoNovaTarefa) return;

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataHoje = `${ano}-${mes}-${dia}`;

    const catInicial = (this.filtroCategoria && this.filtroCategoria !== '_NOVA_') ? this.filtroCategoria : '';

    const rascunho: any = {
      ATIVIDADE: '',
      CATEGORIA: catInicial,
      STATUS: 'Pendente',
      DATA_COMECO: dataHoje,
      DATA_FIM: dataHoje,
      CONCLUIDA: false,
      _isNew: true,
      _isEditing: true,
      _loading: false
    };

    for (const crit of this.criteriosAtivos) {
      rascunho[crit.nome] = '';
    }

    this.rascunhoNovaTarefa = rascunho;
    this.tarefas.unshift(rascunho);
  }

  mudarCategoriaTarefa(t: any) {
    if (t._isNew || t._isEditing) return;
    const id = t.ID || t.id || t.id_tarefa;
    if (!id) return;

    t._loading = true;
    this.api.atualizar('tarefa', id, { CATEGORIA: t.CATEGORIA }).subscribe({
      next: () => {
        t._loading = false;
      },
      error: () => {
        t._loading = false;
        alert('Erro ao atualizar a categoria da tarefa.');
        this.carregarDados();
      }
    });
  }

  ativarEdicaoCampo(t: any, campo: string, event?: Event) {
    if (t._loading || t._isEditing) return;
    t._editField = campo;
    t._fieldOriginalVal = t[campo];

    if (event) {
      const cell = event.currentTarget as HTMLElement;
      setTimeout(() => {
        const inputOrSelect = cell?.querySelector('input, select') as HTMLElement;
        if (inputOrSelect) {
          inputOrSelect.focus();
        }
      }, 20);
    }
  }

  cancelarEdicaoCampo(t: any, campo: string) {
    if (t._editField !== campo) return;
    t[campo] = t._fieldOriginalVal;
    t._editField = null;
    delete t._fieldOriginalVal;
  }

  salvarCampoIndividual(t: any, campo: string) {
    if (t._isNew || t._isEditing) return;
    if (t._editField !== campo) return;

    const novoValor = t[campo];
    const valorAntigo = t._fieldOriginalVal;
    t._editField = null;
    delete t._fieldOriginalVal;

    if (novoValor === valorAntigo) return;

    if (campo === 'ATIVIDADE') {
      const limpo = String(novoValor || '').trim();
      if (!limpo) {
        alert('O nome da tarefa não pode ficar vazio.');
        t[campo] = valorAntigo;
        return;
      }
      t[campo] = limpo;
    }

    if ((campo === 'DATA_COMECO' || campo === 'DATA_FIM') && t.DATA_COMECO && t.DATA_FIM && t.DATA_FIM < t.DATA_COMECO) {
      alert('A Data Final não pode ser anterior à Data Inicial.');
      t[campo] = valorAntigo;
      return;
    }

    const id = t.ID || t.id || t.id_tarefa;
    if (!id) return;

    t._loading = true;
    this.api.atualizar('tarefa', id, {
      cabecalhos: [campo],
      modificacoes: [t[campo]]
    }).subscribe({
      next: (res) => {
        t._loading = false;
        if (!res.sucesso) {
          t[campo] = valorAntigo;
          alert(res.mensagem || 'Erro ao atualizar campo.');
        }
      },
      error: () => {
        t._loading = false;
        t[campo] = valorAntigo;
        alert('Erro ao atualizar campo.');
      }
    });
  }

  abrirModal() {
    this.iniciarNovaTarefa();
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
    const critRemovido = this.criteriosAtivos.find(c => c.id === critId);
    this.criteriosAtivos = this.criteriosAtivos.filter(c => c.id !== critId);
    localStorage.setItem('criteriosAtivos_lista', JSON.stringify(this.criteriosAtivos));

    if (critRemovido && critRemovido.nome) {
      const nomeCol = critRemovido.nome;
      delete this.filtrosCriterios[nomeCol];
      if (this.colunaOrdenacao === nomeCol) {
        this.colunaOrdenacao = '';
      }
      this.tarefas.forEach(t => {
        if (t[nomeCol] !== undefined && t[nomeCol] !== '') {
          t[nomeCol] = '';
          const id = t.ID || t.id || t.id_tarefa;
          if (id && !t._isNew) {
            this.api.atualizar('tarefa', id, {
              cabecalhos: [nomeCol],
              modificacoes: ['']
            }).subscribe();
          }
        }
      });
    }
  }

  salvarTarefa() {
    const nomeAtividade = this.novaTarefa.nomeAtividade.trim();
    if (!nomeAtividade) {
      alert('Digite o texto da tarefa.');
      return;
    }

    if (this.novaTarefa.dataComeco && this.novaTarefa.dataFim && this.novaTarefa.dataFim < this.novaTarefa.dataComeco) {
      alert('A Data Final não pode ser anterior à Data Inicial.');
      return;
    }

    if (!this.atividades.find(a => (a.NOME || a.nome) === nomeAtividade)) {
      this.api.criar('atividade', { nome: nomeAtividade, NOME: nomeAtividade }).subscribe(res => {
        if (res.sucesso) this.atividades.push({ NOME: nomeAtividade, nome: nomeAtividade });
      });
    }

    if (this.filtroCategoria && this.filtroCategoria !== '_NOVA_') {
      this.novaTarefa.nomeCategoria = this.filtroCategoria;
    }

    this.carregando = true;
    const payload = {
      ATIVIDADE: nomeAtividade,
      CATEGORIA: this.novaTarefa.nomeCategoria,
      STATUS: this.novaTarefa.nomeStatus || 'Pendente',
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
    
    const somaCalculada = this.calcularSomaTarefa(tarefa);
    const payload = {
      action: 'conclusao',
      idTarefa: id,
      pontos: somaCalculada,
      idAutorizacao: localStorage.getItem('usuarioId') || ''
    };

    this.api.postCustom(payload).subscribe(res => {
      tarefa._loading = false;
      if (res.sucesso) {
        // The mock API already toggles the value in the DB, so reload to stay in sync
        this.carregarDados();
      } else {
        alert(res.mensagem);
      }
    }, () => {
      alert('Erro ao marcar conclusão.');
      tarefa._loading = false;
    });
  }

  editarTarefa(t: any) {
    // Snapshot BEFORE setting _isEditing so the original doesn't contain _isEditing=true
    const snapshot: any = {};
    for (const key of Object.keys(t)) {
      if (!key.startsWith('_')) {
        snapshot[key] = t[key];
      }
    }
    t._original = snapshot;
    t._isEditing = true;
  }

  cancelarEdicao(t: any) {
    if (t._isNew) {
      this.tarefas = this.tarefas.filter(item => item !== t && !item._isNew);
      this.rascunhoNovaTarefa = null;
      return;
    }
    if (t._original) {
      // Restore only data properties (non-transient)
      for (const key of Object.keys(t._original)) {
        t[key] = t._original[key];
      }
    }
    t._isEditing = false;
    t._loading = false;
    delete t._original;
  }

  salvarEdicao(t: any) {
    const nomeAtiv = String(t.ATIVIDADE || '').trim();
    if (!nomeAtiv) {
      alert('O nome da tarefa não pode ficar vazio.');
      return;
    }
    t.ATIVIDADE = nomeAtiv;

    if (t.DATA_COMECO && t.DATA_FIM && t.DATA_FIM < t.DATA_COMECO) {
      alert('A Data Final não pode ser anterior à Data Inicial.');
      return;
    }

    if (t.CATEGORIA && !this.categorias.find(c => (c.NOME || c.nome) === t.CATEGORIA)) {
      this.api.criar('categoria', { nome: t.CATEGORIA, NOME: t.CATEGORIA }).subscribe(res => {
        if (res.sucesso) this.categorias.push({ NOME: t.CATEGORIA, nome: t.CATEGORIA });
      });
    }
    if (t.ATIVIDADE && !this.atividades.find(a => (a.NOME || a.nome) === t.ATIVIDADE)) {
      this.api.criar('atividade', { nome: t.ATIVIDADE, NOME: t.ATIVIDADE }).subscribe(res => {
        if (res.sucesso) this.atividades.push({ NOME: t.ATIVIDADE, nome: t.ATIVIDADE });
      });
    }
    if (t.STATUS && !this.statusList.find(s => (s.NOME || s.nome) === t.STATUS)) {
      this.api.criar('status', { nome: t.STATUS, NOME: t.STATUS }).subscribe(res => {
        if (res.sucesso) this.statusList.push({ NOME: t.STATUS, nome: t.STATUS });
      });
    }

    if (t._isNew) {
      t._loading = true;
      const payload: any = {
        ATIVIDADE: t.ATIVIDADE,
        CATEGORIA: t.CATEGORIA || '',
        STATUS: t.STATUS || 'Pendente',
        DATA_COMECO: t.DATA_COMECO || '',
        DATA_FIM: t.DATA_FIM || '',
        CONCLUIDA: Boolean(t.CONCLUIDA)
      };
      for (const crit of this.criteriosAtivos) {
        if (t[crit.nome] !== undefined) {
          payload[crit.nome] = t[crit.nome];
        }
      }

      this.api.criar('tarefa', payload).subscribe({
        next: (res) => {
          t._loading = false;
          if (res.sucesso) {
            t._isNew = false;
            t._isEditing = false;
            this.rascunhoNovaTarefa = null;
            this.carregarDados();
          } else {
            alert(res.mensagem || 'Erro ao criar a tarefa.');
          }
        },
        error: () => {
          t._loading = false;
          alert('Erro ao salvar a nova tarefa.');
        }
      });
      return;
    }

    const id = t.ID || t.id || t.id_tarefa;
    if (!id) {
      t._isEditing = false;
      return;
    }

    const modifiedFields: string[] = [];
    const modifiedValues: any[] = [];

    const fixedFields = ['CATEGORIA', 'ATIVIDADE', 'STATUS', 'DATA_COMECO', 'DATA_FIM'];
    for (const f of fixedFields) {
      if (!t._original || t[f] !== t._original[f]) {
        modifiedFields.push(f);
        modifiedValues.push(t[f]);
      }
    }
    
    for (const crit of this.criteriosAtivos) {
      if (!t._original || t[crit.nome] !== t._original[crit.nome]) {
        modifiedFields.push(crit.nome);
        modifiedValues.push(t[crit.nome]);
      }
    }

    if (modifiedFields.length === 0) {
      t._isEditing = false;
      return;
    }

    t._loading = true;
    
    this.api.atualizar('tarefa', id, {
      cabecalhos: modifiedFields,
      modificacoes: modifiedValues
    }).subscribe(res => {
      t._loading = false;
      t._isEditing = false;
      
      if (!res.sucesso) {
        alert(res.mensagem || 'Erro interno ao salvar. Atualizamos a interface por segurança.');
      }
      this.carregarDados();
    }, () => {
      t._loading = false;
      t._isEditing = false;
      alert('Erro ao comunicar com a base local.');
      this.carregarDados();
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
