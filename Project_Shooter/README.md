# Voxel Arena

Многопользовательский браузерный шутер на чистом JavaScript, CSS 3D transforms, PeerJS и Howler.js.

## Локальный запуск

Откройте папку `blockshooter-master` через любой статический HTTP-сервер.

Пример:

```bash
cd blockshooter-master
python -m http.server 8000
```

Затем откройте `http://localhost:8000`.

## Деплой на Render

В репозитории уже есть `render.yaml`, поэтому Render может настроить проект автоматически.

1. Загрузите проект на GitHub.
2. Откройте [Render Dashboard](https://dashboard.render.com/).
3. Нажмите `New +` -> `Blueprint`.
4. Подключите GitHub-репозиторий с этим проектом.
5. Render прочитает `render.yaml` и создаст Static Site:
   - `rootDir`: `blockshooter-master`
   - `staticPublishPath`: `.`
6. Нажмите `Apply` / `Deploy`.

Если создаете сервис вручную:

1. `New +` -> `Static Site`.
2. Выберите репозиторий.
3. Укажите:
   - `Root Directory`: `blockshooter-master`
   - `Build Command`: оставить пустым
   - `Publish Directory`: `.`
4. Нажмите `Create Static Site`.

## Важные замечания

- Игра использует PeerJS через CDN для мультиплеера и Howler.js через CDN для звука.
- Если CDN недоступны, проект теперь не падает: запускается одиночный режим без сетевой игры и без звука.
- Для полноценного мультиплеера браузеры игроков должны иметь доступ к PeerJS и WebRTC.

## Управление

| Клавиша | Действие |
| --- | --- |
| W A S D | Движение |
| Space | Прыжок / джетпак |
| Shift | Приседание |
| Мышь | Обзор |
| ЛКМ | Стрельба |
| ПКМ | Прицеливание |
| E + ЛКМ | Построить блок |
| Tab | Таблица игроков |
| C | Чат |
