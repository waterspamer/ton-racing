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

// Добавляем массив идеальных оборотов переключения для каждой передачи
const IDEAL_SHIFT_RPMS = [0, 6700, 6500, 6300, 6100, 5900, 5700]; // Индекс 0 для нейтрали

// Введение массивов RPM_DECREASE_RATES и INCREASE_RATIOS для разных передач
const RPM_DECREASE_RATES = [8000, 500, 400, 300, 200, 150, 100]; // Индекс 0: Neutral, 1-6: Gears 1-6
const INCREASE_RATIOS = [1, 0.25, 0.2, 0.15, 0.12, 0.07, 0.03]; // Индекс 0: Neutral, 1-6: Gears 1-6

const FINISH_POSITION = 402; // Примерное расстояние до финиша (в единицах вашей игровой сцены)

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
    gearRatios: TRANSMISSION_GEAR_RATIOS.slice(), // Используем реальные передаточные числа
    startTime: null,
    shiftFeedback: '', // Для отображения GOOD SHIFT / PERFECT SHIFT
    accelerationBonus: 0, // Бонус к ускорению
    accelerationBonusTimer: 0, // Таймер для бонуса
    isCountdownActive: false, // Флаг для отслеживания активного отсчета
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
    let revs = document.getElementById('revs');
    if (revs) {
        revs.style.width = `${(value / MAX_RPM) * 100}%`;
    }

    const revmeterGauge = document.querySelector('#revmeter .gauge');
    if (revmeterGauge) {
        revmeterGauge.style.setProperty('--rpm', value);
        revmeterGauge.style.setProperty('--gauge-value', value / 1000);
    }
}

function updateKmh(value) {
    const speedLabel = document.getElementById('speed-label');
    if (speedLabel) {
        speedLabel.textContent = Math.round(value * 3.6) + ' KM/H';
    }
    const speedometerGauge = document.querySelector('#speedometer .gauge');
    if (speedometerGauge) {
        speedometerGauge.style.setProperty('--kmh', Math.round(value));
        speedometerGauge.style.setProperty('--gauge-value', value / 270); // Предполагая, что max km/h = 270
    }
}

function updateGear(value) {
    let gearElement = document.getElementById('gear');
    if (gearElement) {
        gearElement.innerText = value === 0 ? 'N' : value;
    }
}

function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement && gameState.isRaceStarted && !gameState.hasFinished) {
        const elapsed = (performance.now() - gameState.startTime) / 1000; // в секундах
        timerElement.textContent = elapsed.toFixed(2) + 's';
    }
}

function showShiftFeedback(message) {
    const feedbackElement = document.getElementById('shift-feedback');
    if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.classList.add('visible');
        setTimeout(() => {
            feedbackElement.classList.remove('visible');
        }, 1000); // Показываем сообщение на 1 секунду
    }
}

// Функция обновления градиента на тахометре
function updateRevBgGradient() {
    const revBg = document.getElementById('rev-bg');
    if (!revBg) return;

    const currentGear = gameState.currentGear || 1; // Используем передачу 1, если нейтраль
    const idealShiftRPM = IDEAL_SHIFT_RPMS[currentGear];

    const idealShiftPercent = ((idealShiftRPM - MIN_RPM) / (MAX_RPM - MIN_RPM)) * 100;
    const gradient = `linear-gradient(to right, blue 0%, green ${idealShiftPercent}%, red 100%)`;

    revBg.style.background = gradient;
}

// Функция обновления маркеров идеального переключения
function updateIdealShiftMarkers() {
    const revBg = document.getElementById('rev-bg');
    const markerUp = document.querySelector('#ideal-shift-marker .triangle-up');
    const markerDown = document.querySelector('#ideal-shift-marker .triangle-down');

    if (!revBg || !markerUp || !markerDown) return;

    const currentGear = gameState.currentGear || 1; // Используем передачу 1, если нейтраль
    const idealShiftRPM = IDEAL_SHIFT_RPMS[currentGear];

    const idealShiftPercent = ((idealShiftRPM - MIN_RPM) / (MAX_RPM - MIN_RPM)) * 100;

    const markerOffset = idealShiftPercent;

    markerUp.style.left = `calc(${markerOffset}% - 0.5vh)`;
    markerDown.style.left = `calc(${markerOffset}% - 0.5vh)`;
}

// Обработчики событий для педали газа
const gasPedal = document.getElementById('gas-pedal');

if (gasPedal) {
    gasPedal.addEventListener('pointerdown', () => {
        gas = true;
        gameState.isGasPressed = true;
        console.log('Gas pedal pressed');
        gasPedal.classList.add('pressed');

        // Запускаем звук двигателя при нажатии газа, если звук еще не запущен
        if (!engineSource && audioCtx && engineBuffer && gameState.isRaceStarted) {
            startEngineSound();
        }
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
const shiftPedalButton = document.getElementById('shift-pedal'); // Проверьте правильность ID
// const gearDownButton = document.querySelector('button[name="gear-down"]'); // Не используется, можно удалить или добавить кнопку в HTML

if (shiftPedalButton) {
    shiftPedalButton.addEventListener('click', handleGearUp);
}

// Добавляем обработчик события keydown на весь документ
document.addEventListener('keydown', function(event) {
    // Проверяем, нажата ли клавиша Shift
    if (event.shiftKey) {
        switch(event.key) {
            case 'ArrowUp':
                // Предотвращаем выполнение стандартного действия браузера при нажатии стрелки вверх
                event.preventDefault();
                handleGearUp();
                break;
            // case 'ArrowDown':
                // Предотвращаем выполнение стандартного действия браузера при нажатии стрелки вниз
                // event.preventDefault();
                // handleGearDown();
                // break;
            default:
                break;
        }
    }
});

/**
 * Обработчик нажатия кнопки "Повысить передачу"
 */
function handleGearUp() {
    // Не позволяем переключать передачу во время отсчета
    if (gameState.isCountdownActive) return;

    if (gameState.currentGear < 6) { // Предполагаем максимум 6 передач
        const oldGear = gameState.currentGear;
        const newGear = oldGear === 0 ? 1 : oldGear + 1;

        const oldGearRatio = TRANSMISSION_GEAR_RATIOS[oldGear];
        const newGearRatio = TRANSMISSION_GEAR_RATIOS[newGear];

        // Вычисляем разницу RPM между текущими и идеальными оборотами
        const currentRPM = gameState.rpm;
        const idealShiftRPM = IDEAL_SHIFT_RPMS[oldGear];

        const rpmDifference = Math.abs(currentRPM - idealShiftRPM);

        // Определяем качество переключения и применяем бонус
        if (rpmDifference <= 100) {
            showShiftFeedback('PERFECT SHIFT');
            gameState.accelerationBonus = 0.2; // Бонус к ускорению для PERFECT SHIFT
            gameState.accelerationBonusTimer = 1.0; // Бонус длится 1 секунду
        } else if (rpmDifference <= 200) {
            showShiftFeedback('GOOD SHIFT');
            gameState.accelerationBonus = 0.1; // Бонус к ускорению для GOOD SHIFT
            gameState.accelerationBonusTimer = 0.5; // Бонус длится 0.5 секунды
        } else {
            // Нет бонуса
            gameState.accelerationBonus = 0;
            gameState.accelerationBonusTimer = 0;
        }

        // Переключаем передачу
        gameState.currentGear = newGear;

        // Корректируем RPM
        if (oldGearRatio !== 0 && newGearRatio !== 0) {
            gameState.rpm = gameState.rpm * (newGearRatio / oldGearRatio);
            gameState.rpm = Math.max(MIN_RPM, Math.min(gameState.rpm, MAX_RPM));
        }

        console.log(`Передача переключена на ${gameState.currentGear}. Новые RPM: ${gameState.rpm.toFixed(2)}`);
        updateGear(gameState.currentGear);
        updateRpm(gameState.rpm); // Обновляем UI с новым RPM

        // Обновляем градиент и маркеры
        updateRevBgGradient();
        updateIdealShiftMarkers();
    }
}

/**
 * Обработчик нажатия кнопки "Понизить передачу"
 */
/* function handleGearDown() {
    // Не позволяем переключать передачу во время отсчета
    if (gameState.isCountdownActive) return;

    if (gameState.currentGear > 0) { // Предполагаем минимум Neutral (0)
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
        }

        console.log(`Передача переключена на ${gameState.currentGear === 0 ? 'Neutral' : gameState.currentGear}. Новые RPM: ${gameState.rpm.toFixed(2)}`);
        updateGear(gameState.currentGear);
        updateRpm(gameState.rpm); // Обновляем UI с новым RPM

        // Обновляем градиент и маркеры
        updateRevBgGradient();
        updateIdealShiftMarkers();
    }
} */

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
    gameState.startTime = null;
    gameState.accelerationBonus = 0;
    gameState.accelerationBonusTimer = 0;
    gameState.isCountdownActive = true;

    // Обновляем градиент и маркеры при старте
    updateRevBgGradient();
    updateIdealShiftMarkers();

    // Обновить UI
    updateRpm(gameState.rpm);
    updateKmh(gameState.speed);
    updateGear(gameState.currentGear);

    // Скрываем таймер до начала гонки
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.style.display = 'none';
    }

    // Деактивируем кнопку переключения передач
    if (shiftPedalButton) {
        shiftPedalButton.classList.add('disabled');
        shiftPedalButton.style.pointerEvents = 'none'; // Дополнительная защита
    }

    // Показываем стартовый отсчет
    startCountdown(4); // 4 секунды
}

/**
 * Функция для запуска стартового отсчета
 * @param {number} seconds - Количество секунд для отсчета
 */
function startCountdown(seconds) {
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) return;

    countdownElement.style.display = 'block';
    countdownElement.textContent = seconds;

    const interval = setInterval(() => {
        seconds--;
        if (seconds > 0) {
            countdownElement.textContent = seconds;
        } else {
            clearInterval(interval);
            countdownElement.style.display = 'none';
            gameState.isRaceStarted = true;
            gameState.startTime = performance.now();
            gameState.isCountdownActive = false;
            console.log('Гонка началась!');

            // Активируем кнопку переключения передач
            if (shiftPedalButton) {
                shiftPedalButton.classList.remove('disabled');
                shiftPedalButton.style.pointerEvents = 'auto'; // Восстановление кликабельности
            }

            // Автоматически переключаем на первую передачу
            gameState.currentGear = 1;
            updateGear(gameState.currentGear);
            updateRevBgGradient();
            updateIdealShiftMarkers();

            // Показываем таймер
            const timerElement = document.getElementById('timer');
            if (timerElement) {
                timerElement.style.display = 'block';
            }
        }
    }, 1000);
}

const wheelRadius = 0.3; // метры

function updateWheelRotation(deltaTime) {
    // Реализуйте функцию обновления вращения колес, если необходимо
}

/**
 * Основной цикл обновления физики
 * @param {number} deltaTime - Время, прошедшее с последнего обновления (в секундах)
 */
function updatePhysics(deltaTime) {
    // Обновляем обороты двигателя независимо от того, началась гонка или нет
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

    // Обновление UI оборотов двигателя
    updateRpm(gameState.rpm);

    // Обновление звука двигателя с текущими RPM
    if (engineSource) {
        updateEngineSound(gameState.rpm);
    }

    // Во время отсчета не обновляем физику движения автомобиля
    if (!gameState.isRaceStarted || gameState.hasFinished) {
        return;
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

        // Применяем бонус к ускорению, если активен
        if (gameState.accelerationBonusTimer > 0) {
            gameState.speed += gameState.accelerationBonus * gameState.speed;
            gameState.accelerationBonusTimer -= deltaTime;

            if (gameState.accelerationBonusTimer <= 0) {
                gameState.accelerationBonus = 0;
                gameState.accelerationBonusTimer = 0;
            }
        }
    }

    // Ограничение скорости до разумного предела (может потребовать настройки)
    const MAX_SPEED = 400; // Максимальная скорость (например, 400 км/ч)
    if (gameState.speed > MAX_SPEED) {
        gameState.speed = MAX_SPEED;
    }

    // Обновление позиции автомобиля
    gameState.position += gameState.speed * deltaTime;

    // Обновление вращения колес
    updateWheelRotation(deltaTime);

    // Обновление позиции 3D-модели автомобиля
    if (typeof body !== 'undefined' && body.position) {
        body.position.z = gameState.position;
        cubeCamera.position.z = body.position.z;
        cubeCamera.position.y = 0.1;
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
    if (gameState.isRaceStarted && !gameState.hasFinished) {
        updateTimer();
    }

    // Обновление UI скорости
    updateKmh(gameState.speed);

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

    if (!gameState.hasFinished) {
        updatePhysics(deltaTime);
    }
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
    if (clampedFrequency >= 60) {
        hapticStyle = 'heavy';
    } else if (clampedFrequency >= 30) {
        hapticStyle = 'medium';
    }

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
