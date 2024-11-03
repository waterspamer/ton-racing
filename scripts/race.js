// race.js

/**
 * Запуск гонки при загрузке страницы
 */
/* window.addEventListener('load', function () {
    startRace();
}); */

/**
 * Запуск гонки
 */
function startRace(){
    loadEngineSound();
    if (Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready(); // Уведомление Telegram о готовности приложения
    }
    startGame();
}

// Основные константы для управления RPM и скоростью
const MIN_RPM = 800; // Минимальные обороты (идл)
const MAX_RPM = 8000; // Максимальные обороты
const RPM_INCREASE_RATE = 10000; // Обороты в секунду при нажатой педали газа

// Введение массивов RPM_DECREASE_RATES и INCREASE_RATIOS для разных передач
const RPM_DECREASE_RATES = [8000, 500, 400, 300, 200, 150, 100]; // Индекс 0: Neutral, 1-6: Gears 1-6
const INCREASE_RATIOS = [1, 0.3, 0.2, 0.15, 0.12, 0.1, 0.05]; // Индекс 0: Neutral, 1-6: Gears 1-6

const FINISH_POSITION = 1000; // Примерное расстояние до финиша (в единицах вашей игровой сцены)

// Константы для физики автомобиля
const FINAL_DRIVE_RATIO = 3.56; // Финальное передаточное отношение
const SPEED_CONSTANT = 0.021; // Константа для расчета скорости (настройте по необходимости)

const cameraOffset = new THREE.Vector3(-2, 3, -4); // x, y, z

// Реальные передаточные числа BMW M3 GTR
const TRANSMISSION_GEAR_RATIOS = [0, 3.19, 1.98, 1.35, 1.00, 0.87, 0.73]; // Индекс 0: Neutral, 1-6: Gears 1-6

// Основные переменные состояния
let gameState = {
    isRaceStarted: false,
    isGasPressed: false,
    currentGear: 0, // 0: Neutral, 1-6: Gears 1-6
    rpm: MIN_RPM, // Изначальные обороты (идл)
    speed: 0,
    position: 0,
    timeElapsed: 0,
    hasFinished: false,
    gearRatios: TRANSMISSION_GEAR_RATIOS, // Используем реальные передаточные числа
};

// Переменная для управления педалью газа
let gas = false;

// Звуковые переменные
let audioCtx;
let engineBuffer;
let engineSource;

// Переменные для виброотклика
let hapticIntervalId = null;

// Функции для обновления UI через CSS переменные
function updateRpm(value) {
    const revmeterGauge = document.querySelector('#revmeter .gauge');
    if (revmeterGauge) {
        revmeterGauge.style.setProperty('--rpm', value);
        revmeterGauge.style.setProperty('--gauge-value', value / 1000);
    }
}

function updateKmh(value) {
    const speedLabel = document.getElementById('speed-label');
    if (speedLabel) {
        speedLabel.textContent = Math.round(value * 3.6);
    }
    const speedometerGauge = document.querySelector('#speedometer .gauge');
    if (speedometerGauge) {
        speedometerGauge.style.setProperty('--kmh', Math.round(value));
        speedometerGauge.style.setProperty('--gauge-value', value / 270); // Предполагая, что max km/h = 270
    }
}

function updateGear(value) {
    const gearDisplay = document.querySelector('#revmeter .gauge .gear');
    if (gearDisplay) {
        const gearText = value === 0 ? 'N' : `Gear: ${value}`;
        gearDisplay.textContent = gearText;
    }
}

// Обработчики событий для педали газа
const gasPedal = document.getElementById('gas-pedal');

if (gasPedal) {
    gasPedal.addEventListener('pointerdown', () => {
        gas = true;
        gameState.isGasPressed = true;
        console.log('Gas pedal pressed');
        gasPedal.classList.add('pressed');
    });

    gasPedal.addEventListener('pointerup', () => {
        gas = false;
        gameState.isGasPressed = false;
        console.log('Gas pedal released');
        gasPedal.classList.remove('pressed');
    });

    // Обработка события "pointerleave"
    gasPedal.addEventListener('pointerleave', () => {
        gas = false;
        gameState.isGasPressed = false;
        console.log('Gas pedal pointer left');
        gasPedal.classList.remove('pressed');
    });
}

// Обработчики нажатия кнопок "gear-up" и "gear-down"
const gearUpButton = document.getElementById('shift-pedal'); // Проверьте правильность ID
const gearDownButton = document.querySelector('button[name="gear-down"]');

if (gearUpButton) {
    gearUpButton.addEventListener('click', handleGearUp);
}

if (gearDownButton) {
    gearDownButton.addEventListener('click', handleGearDown);
}

// Обработка изменения коэффициентов передач через слайдеры
const gearControls = Array.from(document.querySelectorAll('input[type=range][name^=gear]'));

gearControls.forEach((gearControl, index) => {
    // gears are 1-6, index 0 corresponds to gear 1
    const gearNumber = index + 1;
    gearControl.addEventListener('input', function () {
        let value = Number.parseFloat(this.value);
        const minValue = Number.parseFloat(this.dataset.min) || 1;
        const maxValue = Number.parseFloat(this.dataset.max) || 100;

        if (value < minValue) {
            this.value = minValue;
            value = minValue;
        }
        if (value > maxValue) {
            this.value = maxValue;
            value = maxValue;
        }

        // Обновляем соседние диапазоны для предотвращения перекрытия
        if (index > 0) {
            gearControls[index - 1].dataset.max = (value - 0.1).toFixed(2); // небольшое изменение для предотвращения наложения
        }
        if (index < gearControls.length - 1) {
            gearControls[index + 1].dataset.min = (value + 0.1).toFixed(2);
        }

        // Обновляем коэффициент передачи
        // Assuming the slider adjusts the gearRatio as a multiple (transmissionGearRatio)
        gameState.gearRatios[gearNumber] = value !== 0 ? value : TRANSMISSION_GEAR_RATIOS[gearNumber];
        this.nextElementSibling.textContent = `Gear ${gearNumber}: ${value.toFixed(2)}`;

        console.log(`Коэффициент передачи ${gearNumber}: ${value.toFixed(2)}`);
    });
});

/**
 * Обработчик нажатия кнопки "Повысить передачу"
 */
function handleGearUp() {
    if (gameState.currentGear < 6) { // Предполагаем максимум 6 передач
        // Проверить условия переключения (например, RPM в допустимом диапазоне и не нажат газ)
        if (!gas && gameState.rpm > 3500 /* && gameState.rpm < 6500 */) {
            const oldGear = gameState.currentGear;
            const newGear = oldGear === 0 ? 1 : oldGear + 1;

            const oldGearRatio = TRANSMISSION_GEAR_RATIOS[oldGear];
            const newGearRatio = TRANSMISSION_GEAR_RATIOS[newGear];

            // Переключаем передачу
            gameState.currentGear = newGear;

            // Корректируем RPM
            if (oldGearRatio !== 0 && newGearRatio !== 0) {
                gameState.rpm = gameState.rpm * (newGearRatio / oldGearRatio);
                gameState.rpm = Math.max(MIN_RPM, Math.min(gameState.rpm, MAX_RPM));
            } else {
                // Если переключение из нейтрали, устанавливаем RPM на фиксированное значение
                gameState.rpm = 1500; // Можно настроить
            }

            console.log(`Передача переключена на ${gameState.currentGear}. Новые RPM: ${gameState.rpm.toFixed(2)}`);
            updateGear(gameState.currentGear);
            updateRpm(gameState.rpm); // Обновляем UI с новым RPM
        } else {
            // Обработать неправильное переключение (например, уведомление)
            console.warn('Неправильное переключение передачи!');
        }
    }
}

/**
 * Обработчик нажатия кнопки "Понизить передачу"
 */
function handleGearDown() {
    if (gameState.currentGear > 0) { // Предполагаем минимум Neutral (0)
        // Проверить условия переключения (например, RPM в допустимом диапазоне и не нажат газ)
        if (!gas && gameState.rpm > 1500 && gameState.rpm < 6500) {
            const oldGear = gameState.currentGear;
            const newGear = oldGear === 1 ? 0 : oldGear - 1;

            const oldGearRatio = TRANSMISSION_GEAR_RATIOS[oldGear];
            const newGearRatio = TRANSMISSION_GEAR_RATIOS[newGear];

            // Переключаем передачу
            gameState.currentGear = newGear;

            // Корректируем RPM
            if (newGear !== 0 && oldGearRatio !== 0) {
                gameState.rpm = gameState.rpm * (newGearRatio / oldGearRatio);
                gameState.rpm = Math.max(MIN_RPM, Math.min(gameState.rpm, MAX_RPM));
            } else {
                // Если переключение на нейтральную передачу, устанавливаем RPM на минимальное значение
                gameState.rpm = MIN_RPM;
            }

            console.log(`Передача переключена на ${gameState.currentGear === 0 ? 'Neutral' : gameState.currentGear}. Новые RPM: ${gameState.rpm.toFixed(2)}`);
            updateGear(gameState.currentGear);
            updateRpm(gameState.rpm); // Обновляем UI с новым RPM
        } else {
            // Обработать неправильное переключение
            console.warn('Неправильное переключение передачи!');
        }
    }
}

/**
 * Инициализация гонки
 * Устанавливает начальные значения и запускает отсчет до старта
 */
function initRace() {
    // Установить начальные значения переменных состояния
    gameState.isRaceStarted = false;
    gameState.currentGear = 0; // Neutral
    gameState.rpm = MIN_RPM;
    gameState.speed = 0;
    gameState.position = 0;
    gameState.timeElapsed = 0;
    gameState.hasFinished = false;

    // Обновить UI
    updateRpm(gameState.rpm);
    updateKmh(gameState.speed);
    updateGear(gameState.currentGear);

    // Запустить гонку через 1 секунду
    setTimeout(() => {
        gameState.isRaceStarted = true;
        console.log('Гонка началась!');
        startEngineSound(); // Запуск звука двигателя при старте гонки
    }, 1000);
}

/**
 * Основной цикл обновления физики
 * @param {number} deltaTime - Время, прошедшее с последнего обновления (в секундах)
 */
function updatePhysics(deltaTime) {
    if (gameState.isGasPressed) {
        // Если педаль газа нажата, увеличиваем RPM с учетом INCREASE_RATIOS
        const currentIncreaseRatio = INCREASE_RATIOS[gameState.currentGear] || 1;
        gameState.rpm += RPM_INCREASE_RATE * currentIncreaseRatio * deltaTime;

        // Ограничиваем RPM до максимального значения
        if (gameState.rpm > MAX_RPM) {
            gameState.rpm = MAX_RPM;
        }
    } else {
        // Если педаль газа не нажата, уменьшаем RPM
        // Используем RPM_DECREASE_RATES в зависимости от текущей передачи
        const currentRPMDecreaseRate = RPM_DECREASE_RATES[gameState.currentGear] || RPM_DECREASE_RATES[0];
        gameState.rpm -= currentRPMDecreaseRate * deltaTime;

        // Ограничиваем RPM до минимального значения
        if (gameState.rpm < MIN_RPM) {
            gameState.rpm = MIN_RPM;
        }
    }

    // Получение передаточного коэффициента текущей передачи
    const gearRatio = gameState.gearRatios[gameState.currentGear]; // Коэффициент передачи
    const overallDriveRatio = gearRatio * FINAL_DRIVE_RATIO; // Общий передаточный коэффициент

    // Расчет скорости пропорционально RPM и передаче
    if (gearRatio === 0) {
        // Neutral: speed remains zero
        gameState.speed = 0;
    } else {
        gameState.speed = (gameState.rpm * SPEED_CONSTANT) / overallDriveRatio;
    }

    // Ограничение скорости до разумного предела (может потребовать настройки)
    const MAX_SPEED = 400; // Максимальная скорость (например, 400 км/ч)
    if (gameState.speed > MAX_SPEED) {
        gameState.speed = MAX_SPEED;
    }

    // Обновление позиции автомобиля
    gameState.position += gameState.speed * deltaTime;

    // Обновление позиции 3D-модели автомобиля
    if (typeof body !== 'undefined' && body.position) {
        body.position.z = gameState.position;
    }

    // Плавное следование камеры за автомобилем
    if (typeof camera !== 'undefined' && typeof body !== 'undefined') {
        // Рассчитываем желаемую позицию камеры
        const desiredCameraPosition = body.position.clone().add(cameraOffset);

        // Плавно перемещаем камеру к желаемой позиции с помощью lerp
        camera.position.lerp(desiredCameraPosition, 0.1); // 0.1 - коэффициент плавности (настройте по необходимости)

        // Направляем камеру на автомобиль
        camera.lookAt(body.position);
    }

    // Обновление времени гонки
    gameState.timeElapsed += deltaTime;

    // Обновление UI
    updateRpm(gameState.rpm);
    updateKmh(gameState.speed);

    // Обновление звука двигателя с текущими RPM
    if (gameState.isRaceStarted && !gameState.hasFinished && engineSource) {
        updateEngineSound(gameState.rpm);
    }

    // Обновление виброотклика с текущими RPM через Telegram API
    if (Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
        triggerHapticFeedback(gameState.rpm);
    }

    // Проверка финиша гонки
    if (gameState.position >= FINISH_POSITION && !gameState.hasFinished) {
        finishRace();
    }
}

/**
 * Обработчик окончания гонки
 */
function finishRace() {
    gameState.hasFinished = true;
    gameState.isRaceStarted = false;
    console.log('Гонка завершена!');
    alert('Гонка завершена!');
    stopEngineSound(); // Остановить звук двигателя при завершении гонки
    stopHapticFeedback(); // Остановить вибрацию
    // Остановить обновление физики или показать результаты
}

/**
 * Основной цикл игры
 */
let lastTime = performance.now();

function gameLoop() {
    requestAnimationFrame(gameLoop);

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // deltaTime в секундах
    lastTime = currentTime;

    if (gameState.isRaceStarted && !gameState.hasFinished) {
        updatePhysics(deltaTime);
    }

    // Обновление графики (например, рендеринг 3D сцены, если используется Three.js)
    // renderer.render(scene, camera);
}

/**
 * Запуск игры
 */
function startGame() {
    initRace();
    gameLoop();
}

/**
 * Загрузка звука двигателя
 */
function loadEngineSound() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "assets/audio/engine.wav", true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function (e) {
        const audioData = this.response;
        audioCtx.decodeAudioData(audioData, function (buffer) {
            engineBuffer = buffer;
        }, function (err) {
            console.error('Ошибка декодирования аудиоданных', err);
        });
    };
    xhr.send();
}

/**
 * Запуск звука двигателя
 */
function startEngineSound() {
    if (audioCtx && engineBuffer && !engineSource) {
        engineSource = audioCtx.createBufferSource();
        engineSource.buffer = engineBuffer;
        engineSource.loop = true;
        engineSource.playbackRate.value = rpmToPlaybackRate(gameState.rpm);
        engineSource.connect(audioCtx.destination);
        engineSource.start();
    }
}

/**
 * Обновление звука двигателя на основе текущих RPM
 * @param {number} rpm - Текущие обороты двигателя
 */
function updateEngineSound(rpm) {
    if (engineSource) {
        const newPlaybackRate = rpmToPlaybackRate(rpm);
        engineSource.playbackRate.setTargetAtTime(newPlaybackRate, audioCtx.currentTime, 0.1); // Плавное изменение
    }
}

/**
 * Остановка звука двигателя
 */
function stopEngineSound() {
    if (engineSource) {
        engineSource.stop();
        engineSource.disconnect();
        engineSource = null;
    }
}

/**
 * Преобразование RPM в playbackRate
 * Здесь вы можете настроить зависимость между RPM и playbackRate
 * Например, нормализовать RPM в диапазон [0.8, 8.2]
 * Можно линейно связать RPM с playbackRate
 * @param {number} rpm - Текущие обороты двигателя
 * @returns {number} - Значение playbackRate
 */
function rpmToPlaybackRate(rpm) {
    const minPlaybackRate = 0.8;
    const maxPlaybackRate = 8.2;
    // Линейная интерполяция
    return minPlaybackRate + ((rpm - MIN_RPM) / (MAX_RPM - MIN_RPM)) * (maxPlaybackRate - minPlaybackRate);
}

/**
 * Функция для триггера виброотклика на основе RPM с использованием Telegram Web Apps Haptic Feedback API
 * @param {number} rpm - Текущие обороты двигателя
 */
function triggerHapticFeedback(rpm) {
    // Частота вибрации в Гц
    const frequency = rpm / 100; // Например, RPM = 4000 => 40 Гц

    // Ограничение частоты до допустимого диапазона
    const minFrequency = 1; // 1 Гц
    const maxFrequency = 100; // 100 Гц
    const clampedFrequency = Math.min(Math.max(frequency, minFrequency), maxFrequency);

    // Интервал между вибрациями в миллисекундах
    const interval = 1000 / clampedFrequency; // Например, 40 Гц => 25 мс

    // Очистка предыдущего интервала, если он существует
    if (hapticIntervalId) {
        clearInterval(hapticIntervalId);
        hapticIntervalId = null;
    }

    // Выбор стиля вибрации в зависимости от частоты
    let hapticStyle = 'light';
    //if (clampedFrequency >= 60) {
        hapticStyle = 'heavy';
    //} else if (clampedFrequency >= 30) {
       // hapticStyle = 'medium';
    //}

    // Установка нового интервала для вибрации
    hapticIntervalId = setInterval(() => {
        if (Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
            Telegram.WebApp.HapticFeedback.impactOccurred(hapticStyle);
        }
    }, interval);
}

/**
 * Остановка виброотклика
 */
function stopHapticFeedback() {
    if (hapticIntervalId) {
        clearInterval(hapticIntervalId);
        hapticIntervalId = null;
    }
}
