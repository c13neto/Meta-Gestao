import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Api } from '../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ApiResponse {
  sucesso: boolean;
  mensagem: string;
  devMsg: any; 
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, NgStyle, NgClass, LucideAngularModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  @ViewChild('carousel') carousel!: ElementRef;

  pontuacaoTotal: number = 0;
  heatmapData: any[] = [];
  carregando: boolean = true;
  
  totalTarefas: number = 0;
  tarefasConcluidas: number = 0;
  tarefasPendentes: number = 0;
  resumoCategorias: { nome: string; count: number }[] = [];
  resumoStatus: { nome: string; count: number }[] = [];

  constructor(private api: Api) {}

  get pontuacaoFormatada(): string {
    return this.pontuacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatarDataLocal(date: Date): string {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.carregando = true;

      forkJoin({
        conclusoes: this.api.listar('conclusao').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
        tarefas: this.api.listar('tarefa').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
        categorias: this.api.listar('categoria').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
        status: this.api.listar('status').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
        criterios: this.api.listar('criterio').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
        opcoes: this.api.listar('criterioOpcoes').pipe(catchError(() => of({ sucesso: true, devMsg: [] })))
      }).subscribe({
        next: (res: any) => {
          this.carregando = false;
          this.processarDados(
            res.conclusoes.devMsg || [],
            res.tarefas.devMsg || [],
            res.categorias.devMsg || [],
            res.status.devMsg || [],
            res.criterios.devMsg || [],
            res.opcoes.devMsg || []
          );
        },
      error: () => {
        this.carregando = false;
      }
    });
  }

  private calcularPontosDaTarefa(t: any, criterios: any[], opcoes: any[]): number {
    let soma = 0;
    const criteriosAtivos = (criterios || []).filter(c => c.ATIVO !== false && c.ativo !== false);
    const opcoesAtivas = (opcoes || []).filter(o => o.ATIVO !== false && o.ativo !== false);

    let ativosLista: any[] = [];
    try {
      const salvosLista = localStorage.getItem('criteriosAtivos_lista');
      if (salvosLista) {
        const parsed = JSON.parse(salvosLista);
        if (Array.isArray(parsed)) {
          ativosLista = parsed;
        }
      }
    } catch {}

    if (ativosLista.length > 0) {
      ativosLista.forEach(ca => {
        const nomeCrit = ca.nome || ca.NOME;
        const valorSelecionado = t[nomeCrit];
        if (valorSelecionado !== undefined && valorSelecionado !== null && String(valorSelecionado).trim() !== '') {
          const valNorm = String(valorSelecionado).trim().toLowerCase();
          const op = (ca.pesos || []).find((p: any) =>
            (p.aval !== undefined && p.aval !== '' && String(p.aval).trim().toLowerCase() === valNorm) ||
            String(p.peso ?? '').trim().toLowerCase() === valNorm
          );
          if (op) {
            const pesoNum = Number(op.peso ?? 0);
            if (!isNaN(pesoNum)) {
              soma += pesoNum;
            }
          }
        }
      });
      return Number(soma.toFixed(2));
    }

    criteriosAtivos.forEach(crit => {
      const nomeCrit = crit.NOME || crit.nome || crit.TEXTO;
      const valorSelecionado = t[nomeCrit];
      if (valorSelecionado !== undefined && valorSelecionado !== null && String(valorSelecionado).trim() !== '') {
        const critId = crit.UUID || crit.id || crit.ID;
        const valNorm = String(valorSelecionado).trim().toLowerCase();
        const opcao = opcoesAtivas.find(o =>
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
            soma += pesoNum;
          }
        }
      }
    });
    return Number(soma.toFixed(2));
  }

  processarDados(
    conclusoes: any[],
    tarefas: any[],
    categorias: any[],
    statusList: any[],
    criterios: any[] = [],
    opcoes: any[] = []
  ) {
    const tarefasAtivas = tarefas.filter(t => t.ATIVO !== false && t.ativo !== false);
    this.totalTarefas = tarefasAtivas.length;

    const completedStatusIds = statusList
       .filter(s => {
          const name = (s.NOME || s.nome || '').toLowerCase();
          return name.includes('concluíd') || name.includes('concluid') || name.includes('finalizad') || name.includes('pront') || name.includes('feit');
       })
       .map(s => String(s.UUID || s.id));
       
    const tarefasConcluidasList = tarefasAtivas.filter(t => {
      if (t.CONCLUIDA || t.concluida) return true;
      const sId = String(t['UUID STATUS'] || t.status_id || t.STATUS || '');
      const sNorm = sId.toLowerCase();
      return completedStatusIds.includes(sId) || sNorm.includes('concluíd') || sNorm.includes('concluid') || sNorm.includes('finaliz');
    });

    this.tarefasConcluidas = tarefasConcluidasList.length;
    this.tarefasPendentes = this.totalTarefas - this.tarefasConcluidas;

    // 1. Process Conclusoes and Points
    this.pontuacaoTotal = 0;
    const pontosPorDia: { [data: string]: number } = {};
    const hojeData = this.formatarDataLocal(new Date());

    const conclusoesAtivas = conclusoes.filter(item => item.ATIVO !== false && item.ativo !== false);

    tarefasConcluidasList.forEach(t => {
      const tId = String(t.UUID || t.id || t.ID || '');
      // Find the latest active conclusion for this task
      const conclusao = [...conclusoesAtivas].reverse().find(c => String(c.idTarefa || c.ID_TAREFA) === tId);
      
      const pontosDosCriterios = this.calcularPontosDaTarefa(t, criterios, opcoes);
      const pontos = pontosDosCriterios;
      let dataStr = hojeData;

      if (conclusao) {
        const h = conclusao.HORARIO || conclusao.horario;
        if (h) {
          const parsedDate = new Date(h);
          if (!isNaN(parsedDate.getTime())) {
            dataStr = this.formatarDataLocal(parsedDate);
          }
        }
      }

      this.pontuacaoTotal += pontos;
      pontosPorDia[dataStr] = (pontosPorDia[dataStr] || 0) + pontos;
    });

    // 2. Generate Heatmap
    this.heatmapData = [];
    const hoje = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
      const dataFormatada = this.formatarDataLocal(d);
      const pontosDoDia = pontosPorDia[dataFormatada] || 0;
      
      let valorIntensidade = 0;
      if (pontosDoDia > 0 && pontosDoDia <= 10) valorIntensidade = 1;
      else if (pontosDoDia > 10 && pontosDoDia <= 30) valorIntensidade = 2;
      else if (pontosDoDia > 30 && pontosDoDia <= 60) valorIntensidade = 3;
      else if (pontosDoDia > 60) valorIntensidade = 4;

      this.heatmapData.push({
        data: dataFormatada,
        valor: valorIntensidade,
        pontos: pontosDoDia,
        cor: this.getCorPorValor(valorIntensidade)
      });
    }

    // 3. Process Categories
    const catMap = new Map<string, number>();
    tarefasAtivas.forEach(t => {
      const cId = t['UUID CATEGORIA'] || t.categoria_id || t.CATEGORIA;
      if (cId) {
        const catObj = categorias.find(c => (c.UUID || c.id) === cId || (c.NOME || c.nome) === cId);
        const nome = catObj ? (catObj.NOME || catObj.nome) : cId;
        catMap.set(nome, (catMap.get(nome) || 0) + 1);
      }
    });

    this.resumoCategorias = Array.from(catMap.entries()).map(([nome, count]) => ({ nome, count }));
    this.resumoCategorias.sort((a, b) => b.count - a.count);

    // 4. Process Status
    const statusMap = new Map<string, number>();
    tarefasAtivas.forEach(t => {
      const sId = t['UUID STATUS'] || t.status_id || t.STATUS;
      if (sId) {
        const statusObj = statusList.find(s => (s.UUID || s.id) === sId || (s.NOME || s.nome) === sId);
        const nome = statusObj ? (statusObj.NOME || statusObj.nome) : sId;
        statusMap.set(nome, (statusMap.get(nome) || 0) + 1);
      }
    });

    this.resumoStatus = Array.from(statusMap.entries()).map(([nome, count]) => ({ nome, count }));
    this.resumoStatus.sort((a, b) => b.count - a.count);
  }

  getCorPorValor(valor: number): string {
    switch(valor) {
      case 0: return '#ebedf0'; 
      case 1: return '#c6e48b'; 
      case 2: return '#7bc96f'; 
      case 3: return '#239a3b'; 
      case 4: return '#196127'; 
      default: return '#ebedf0';
    }
  }

  getStatusBadgeClass(nome: string): string {
    const s = String(nome || '').trim().toLowerCase();
    if (s.includes('concluíd') || s.includes('concluid') || s.includes('finaliz') || s.includes('pront') || s.includes('feit')) {
      return 'dash-status-emerald';
    }
    if (s.includes('andamento') || s.includes('progresso') || s.includes('iniciad') || s.includes('fazendo')) {
      return 'dash-status-blue';
    }
    if (s.includes('revis') || s.includes('test') || s.includes('homolog') || s.includes('análise') || s.includes('analise')) {
      return 'dash-status-purple';
    }
    if (s.includes('bloquead') || s.includes('urgent') || s.includes('atrasad') || s.includes('crític') || s.includes('critic')) {
      return 'dash-status-red';
    }
    if (s.includes('pendent') || s.includes('aguard') || s.includes('fila')) {
      return 'dash-status-amber';
    }
    return 'dash-status-teal';
  }

  scrollCarousel(direction: number) {
    if (this.carousel) {
      const el = this.carousel.nativeElement;
      const containerWidth = el.clientWidth;
      const scrollWidth = el.scrollWidth;
      const currentScroll = el.scrollLeft;
      const maxScroll = scrollWidth - containerWidth;
      const step = containerWidth + 30;

      if (direction === 1) {
        if (Math.ceil(currentScroll) >= maxScroll - 5) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: step, behavior: 'smooth' });
        }
      } else {
        if (currentScroll <= 5) {
          el.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: -step, behavior: 'smooth' });
        }
      }
    }
  }
}
