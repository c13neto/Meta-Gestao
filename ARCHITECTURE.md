# Meta-Gestão - System Architecture & AI Context

This document is intended to provide AI coding assistants (and human developers) with a comprehensive overview of the `Meta-Gestao` project. It describes the application's architecture, data flow, structure, and state management.

## 1. Overview
`Meta-Gestao` is an Angular 21 (standalone components) application used for task management, activity tracking, and criteria-based evaluation. 

**Critical Architectural Note**: The application recently transitioned from using a traditional backend API to a purely **in-memory storage model** using `localStorage`. There is no active backend server. All API calls are intercepted/handled by a generic mock service (`src/app/core/services/api.ts`).

## 2. Core Concepts & Data Flow
### Mock API Service (`src/app/core/services/api.ts`)
This is the heart of the application's data layer.
- **State Storage**: It uses an in-memory object (`this.db`) to hold all records for various entities (usuarios, tarefas, categorias, atividades, status, tipos, criterios, criterioOpcoes).
- **Persistence**: Every time data is mutated, `this.saveDb()` is called to serialize the `this.db` state into `localStorage` under the key `mockDb`.
- **Initialization**: On instantiation, it checks `localStorage` for existing data; if absent, it seeds a default structure.
- **Methods**: Provides generic CRUD methods (`listar`, `criar`, `atualizar`, `deletar`) that simulate HTTP latency using RxJS `delay()`. It also handles custom endpoints like `getCustom` (for login) and `postCustom` (for specific actions like task completion `conclusao`).

### Authentication & Route Guard
- Users authenticate via the `login` route.
- The `Api` service validates the credentials against the in-memory `usuario` list.
- Upon success, the user ID is stored in `localStorage` as `usuarioId`.
- The `AuthGuard` (`src/app/core/services/auth-guard.ts`) checks for the presence of `usuarioId` to allow access to protected routes.

## 3. Directory Structure
```
src/app/
├── app.routes.ts          # Main routing definitions
├── app.config.ts          # Application configuration (providers, router setup)
├── core/
│   ├── models.ts          # Shared TypeScript interfaces
│   ├── services/
│   │   ├── api.ts         # Generic Mock API Service (handles localStorage)
│   │   └── auth-guard.ts  # Route guard for protected pages
│   ├── components/        # Reusable UI components
│   │   ├── headerc/       # Main navigation header
│   │   └── footerc/       # Page footer
│   └── shared/
│       └── icons/         # SVG Icon components (Lucide etc.)
├── pages/                 # Route-level components
│   ├── login/             # Authentication page
│   ├── cadastro/          # Entity management (Categories, Activities, Status, etc.)
│   ├── dashboard/         # Data visualization and metrics
│   ├── lista/             # Task listing and management
│   └── criterios/         # Dynamic criteria columns configuration
```

## 4. Key Pages & Workflows

### Lista (Task Management - `src/app/pages/lista/lista.ts`)
- Displays tasks filtered by the logged-in user (`usuarioId`).
- Supports adding tasks via a modal/sidebar.
- Includes dynamic columns based on "Critérios" (Criteria) that users can configure.
- Features interactive inline editing and deletion of tasks.
- Can toggle a task's completion status, which triggers `postCustom({ action: 'conclusao', ... })` in the API service.

### Cadastro (Settings Management - `src/app/pages/cadastro/cadastro.ts`)
- Administrative panel for managing support tables: Categories, Activities, Status, and Types.
- Uses a tabbed interface.
- Leverages the generic API service for all CRUD operations on these entities.

### Critérios (Dynamic Task Attributes - `src/app/pages/criterios/criterios.ts`)
- Allows users to define custom evaluation criteria that dynamically appear as columns in the Task List (`Lista`).
- Manages both the criteria definitions and their possible options (with weights/points).

### Dashboard (`src/app/pages/dashboard/dashboard.ts`)
- Fetches tasks and displays key metrics (pending vs. completed).
- Provides a summarized view of task categories.
- Reacts to data changes to keep metrics updated.

## 5. UI/UX & Styling Guidelines
- The project emphasizes **Responsive Design** and modern aesthetics.
- CSS is localized to components (`.css` files alongside `.ts` components).
- A recent refactor focused on cleaning up CSS and removing useless comments/rules. Always maintain clean, minimal, and responsive CSS.

## 6. Guidelines for AI Agents
When modifying this codebase, AI agents should adhere to the following rules:
1. **No External HTTP Calls**: Do not introduce `HttpClient` calls to external APIs. All data retrieval and mutation must go through `src/app/core/services/api.ts`.
2. **Generic API Service**: When adding new entities, use the existing generic methods (`listar('novaEntidade')`, `criar('novaEntidade', payload)`). Avoid creating entity-specific services unless strictly necessary.
3. **Standalone Components**: The project uses Angular Standalone Components. Do not attempt to add or modify `NgModule` files (e.g., `app.module.ts`), as they do not exist.
4. **Reactivity**: Ensure that UI components react properly to data changes. Since data is local, operations are fast, but they still return Observables. Always subscribe and handle the asynchronous nature of the mock API.
