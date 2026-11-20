# 🚀 PM2 Web Monitor (HomeServer)

🌐 **Language / Язык:** [English](#-english) | [Русский](#-русский)

---

## 🇬🇧 English

A lightweight, self-hosted web dashboard for monitoring and managing **PM2** processes on a home server. Designed as a fast, autonomous replacement for `app.pm2.io` with zero limits on the number of processes or servers.

### ✨ Key Features

- **Real-Time Process Monitoring** *(auto-refreshes every 3 seconds)*:
  - Process status (`ONLINE`, `STOPPED`, `ERRORED`), `PID`, and `PM2 ID`.
  - Continuous `Uptime` and restart counter (`↺`).
  - Live per-process memory usage (`RAM`) and processor load (`CPU %`).
- **System & Host Metrics**:
  - CPU model, thread count, and system `Load Average`.
  - Used and available RAM.
  - Total server uptime and active `Node.js` runtime version.
- **One-Click Process Management**:
  - 🔄 **Restart** (`pm2 restart`)
  - ⏸ **Stop** (`pm2 stop`) / ▶ **Start** (`pm2 start`)
  - 🗑 **Delete** (`pm2 delete`)
  - 💾 **Save Dump** (`pm2 save`) — persists the process list for automatic recovery on container/server boot (`pm2 resurrect`).
- **In-Browser Live Log Viewer**:
  - Real-time viewing of standard output (`STDOUT`) and error logs (`STDERR`).
  - One-click log flushing (`pm2 flush`).
- **Launch New Projects from Web UI**:
  - Automatically scans project directories inside `/workspace` (`/opt/projects/node`).
  - Start any project by selecting its folder, specifying a PM2 process name, and setting the entry script (e.g., `src/index.js`).

### 🏗 Architecture & Tech Stack

Built with **Node.js (ES Modules)** following a **Zero-Dependencies** design (no external npm packages required) — relies exclusively on native Node.js modules: `node:http`, `node:child_process`, `node:fs/promises`, `node:os`, and `node:path`.

```text
pm2-dashboard/
├── package.json        # Project metadata and start script
├── server.js           # HTTP server and REST API interacting with PM2 CLI
├── README.md           # Bilingual project documentation (EN / RU)
└── public/
    ├── index.html      # Single-page web interface (Dark UI)
    └── pm2.png         # Application icon and favicon
```

### 🔌 Internal REST API

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Returns system metrics, folders in `/workspace`, and the process list from `pm2 jlist` |
| `GET` | `/api/logs?id=<id>` | Returns the last 150 lines of `STDOUT` and `STDERR` logs for the selected process |
| `POST` | `/api/action` | Executes a PM2 command (`restart`, `stop`, `start`, `reload`, `delete`, `flush`, `save`) and saves dump |
| `POST` | `/api/create` | Starts a new process in PM2 (`{ cwd, name, script }`) and saves dump |

### 🚀 Deployment & Access

- **Host Path (NVMe SSD):** `/opt/projects/node/pm2-dashboard`
- **Container Path (`dev-node`):** `/workspace/pm2-dashboard`
- **Internal Port:** `3000` (mapped to host port `3005`)
- **Web UI URL:** [http://100.73.59.34:3005/](http://100.73.59.34:3005/)

#### CLI Management Commands (`dev-node`)

```bash
# Start monitor in PM2
pm2 start /workspace/pm2-dashboard/server.js --name PM2-Monitor
pm2 save

# Restart after code changes
pm2 restart PM2-Monitor

# View monitor logs
pm2 logs PM2-Monitor
```

---

## 🇷🇺 Русский

Легковесная локальная веб-панель для мониторинга и управления процессами **PM2** на домашнем сервере. Разработана как автономная замена облачному сервису `app.pm2.io` без ограничений на количество процессов и серверов.

### ✨ Основные возможности

- **Мониторинг процессов в реальном времени** *(автообновление каждые 3 секунды)*:
  - Статус процесса (`ONLINE`, `STOPPED`, `ERRORED`), `PID`, `PM2 ID`.
  - Время непрерывной работы (`Uptime`) и количество перезапусков (`↺`).
  - Потребление оперативной памяти (`RAM`) и загрузка процессора (`CPU %`) каждым приложением.
- **Системные метрики сервера**:
  - Модель процессора, количество потоков и средняя нагрузка (`Load Average`).
  - Использование и свободный объем оперативной памяти.
  - Общий аптайм сервера и версия среды выполнения `Node.js`.
- **Управление процессами в один клик**:
  - 🔄 **Рестарт** (`pm2 restart`)
  - ⏸ **Стоп** (`pm2 stop`) / ▶ **Старт** (`pm2 start`)
  - 🗑 **Удаление** (`pm2 delete`)
  - 💾 **Сохранение дампа** (`pm2 save`) — автоматическая фиксация списка процессов для восстановления после перезагрузки (`pm2 resurrect`).
- **Просмотр логов прямо в браузере**:
  - Живой просмотр стандартного вывода (`STDOUT`) и лога ошибок (`STDERR`).
  - Очистка логов процесса одной кнопкой (`pm2 flush`).
- **Запуск новых проектов из веб-интерфейса**:
  - Автоматическое сканирование директорий проектов в `/workspace` (`/opt/projects/node`).
  - Запуск любого проекта с указанием имени процесса и входного скрипта (например, `src/index.js`).

### 🏗 Архитектура и стек

Приложение написано на **Node.js (ES Modules)** по принципу **Zero-Dependencies** (без внешних npm-зависимостей) — использует только встроенные модули `node:http`, `node:child_process`, `node:fs/promises`, `node:os` и `node:path`.

```text
pm2-dashboard/
├── package.json        # Метаданные проекта и скрипт запуска
├── server.js           # HTTP-сервер и REST API для взаимодействия с PM2 CLI
├── README.md           # Двуязычная документация проекта (EN / RU)
└── public/
    ├── index.html      # Одностраничный веб-интерфейс (Dark UI)
    └── pm2.png         # Иконка приложения и favicon
```

### 🔌 Внутреннее REST API

| Метод | Эндпоинт | Описание |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Возвращает метрики системы, список папок в `/workspace` и массив процессов из `pm2 jlist` |
| `GET` | `/api/logs?id=<id>` | Возвращает последние 150 строк `STDOUT` и `STDERR` логов выбранного процесса |
| `POST` | `/api/action` | Выполняет команду PM2 (`restart`, `stop`, `start`, `reload`, `delete`, `flush`, `save`) и сохраняет дамп |
| `POST` | `/api/create` | Запускает новый процесс в PM2 (`{ cwd, name, script }`) и сохраняет дамп |

### 🚀 Развертывание и доступ

- **Путь на хосте (NVMe SSD):** `/opt/projects/node/pm2-dashboard`
- **Путь внутри контейнера `dev-node`:** `/workspace/pm2-dashboard`
- **Внутренний порт:** `3000` (проброшен на порт `3005` хоста)
- **Веб-интерфейс:** [http://100.73.59.34:3005/](http://100.73.59.34:3005/)

#### Команды управления через консоль (`dev-node`)

```bash
# Запуск монитора в PM2
pm2 start /workspace/pm2-dashboard/server.js --name PM2-Monitor
pm2 save

# Перезапуск после внесения изменений
pm2 restart PM2-Monitor

# Просмотр логов самого монитора
pm2 logs PM2-Monitor
```
