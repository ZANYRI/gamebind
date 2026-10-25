# Lunoris — 3D Controls & Rebind Studio (Web / GitHub Pages)

Интерактивный веб-конфигуратор раскладки управления для игры **Lunoris** с 3D-превью геймпадов (**DualSense PS5** и **Xbox Series**), полностью повторяющий логику игрового меню `Settings → Controls` (`ControlsView`, `GamepadLayoutPanel`, `GamepadModelRig`, `GamepadPreviewStage`, `InputRebindService`) и позволяющий экспортировать готовый патч `.inputactions` для Unity.

## Возможности
- **3D-визуализация геймпадов (DualSense и Xbox):**
  - Автоматический доворот камеры к нужной стороне геймпада при наведении/выборе действия (`Overview`, `FaceLeft`, `FaceRight`, `TopLeft`, `TopRight`).
  - Процедурная анимация нажатия кнопок, хода курков (`L2/R2`, `LT/RT`), наклона стиков и фирменного фиолетового свечения (`GamepadModelRig`).
  - Интерактивные выносные линии-сноски (`Callouts`) вокруг силуэта контроллера с переключением контекстных слоёв (`Пешком + Меню`, `Автомобиль`, `Фокус животного`, `Lucid Rush QTE`).
  - Вращение модели мышью (`Drag to orbit`) и клик прямо по любой 3D-кнопке на контроллере.
- **Все способы назначения биндов:**
  1. Клик по действию в списке + **клик прямо по кнопке на 3D-модели геймпада**.
  2. Клик по действию в списке + **выбор кнопки из встроенной быстрой палитры**.
  3. Клик по действию в списке + **нажатие кнопки на реальном подключённом геймпаде** (через Web Gamepad API, с живым отражением нажатий и наклонов стиков на 3D-модели).
  4. **Клик по любой кнопке на 3D-геймпаде** в обычном режиме — открывает инспектор этой кнопки со списком привязанных действий и возможностью назначить на неё любое действие из каталога.
  5. Поддержка режима **Клавиатура и Мышь** (`‹ Геймпад (3D) ›` / `‹ Клавиатура и Мышь ›`).
- **Экспорт готового патча для Unity и отчётов:**
  - Скачивание архива `Lunoris_Controls_UnityPatch.zip`, содержащего пропатченные файлы:
    - `Assets/InputSystem_Actions.inputactions`
    - `Assets/External/Malbers Animations/Common/Input System/Assets/Malbers Inputs.inputactions`
    - `Assets/External/NWH/Vehicle Physics 2/Scripts/VehicleController/Input/InputProviders/InputSystem/VehicleInputActions.inputactions`
    - `CHANGES_REPORT.md` — подробный отчёт со списком всех изменений относительно дефолта и полной таблицей раскладки.
    - `Controls_Bindings_PlayerPrefs.json` — JSON в формате `InputRebindService`.
  - Копирование ссылки с зашитым в URL конфигом (`#cfg=...`) для быстрой отправки раскладки в чат.

## Локальный запуск
```bash
npm install
npm run dev
```

## Сборка и деплой на GitHub Pages
Проект уже настроен с `base: './'` в `vite.config.ts` и содержит готовый GitHub Actions workflow в `.github/workflows/deploy.yml`:
1. Запушьте содержимое папки `gamebind-app` в GitHub-репозиторий (ветка `main` или `master`).
2. В настройках репозитория на GitHub откройте **Settings → Pages → Build and deployment → Source** и выберите **GitHub Actions**.
3. После завершения workflow сайт будет доступен по адресу вашего GitHub Pages.
