// race.js

// Основные константы для управления RPM и скоростью
const MIN_RPM = 800; // Минимальные обороты (идл)
const MAX_RPM = 8000; // Максимальные обороты
const RPM_INCREASE_RATE = 6000; // Обороты в секунду при нажатой педали газа
const RPM_DECREASE_RATE = 4000; // Обороты в секунду при отпускании педали газа

const FINISH_POSITION = 1000; // Примерное расстояние до финиша (в единицах вашей игровой сцены)

// Основные переменные состояния
let gameState = {
    isRaceStarted: false,
    isGasPressed: false,
    currentGear: 1,
    rpm: MIN_RPM, // Изначальные обороты (идл)
    speed: 0,
    position: 0,
    timeElapsed: 0,
    hasFinished: false,
    gearRatios: [0, 1 / 125, 1 / 78, 1 / 47, 1 / 34, 1 / 27, 1 / 24], // Индекс 0 не используется
};

// Переменная для управления педалью газа
let gas = false;

// Функции для обновления UI через CSS переменные
function updateRpm(value) {
    const revmeterGauge = document.querySelector('#revmeter .gauge');
    if (revmeterGauge) {
        revmeterGauge.style.setProperty('--rpm', value);
        revmeterGauge.style.setProperty('--gauge-value', value / 1000);
    }
}

function updateKmh(value) {
    const speedometerGauge = document.querySelector('#speedometer .gauge');
    if (speedometerGauge) {
        speedometerGauge.style.setProperty('--kmh', Math.round(value));
        speedometerGauge.style.setProperty('--gauge-value', value / 270); // Предполагая, что max km/h = 270
    }
}

function updateGear(value) {
    const gearDisplay = document.querySelector('#revmeter .gauge .gear');
    if (gearDisplay) {
        gearDisplay.textContent = `Gear: ${value}`;
    }
}

// Обработчики событий для педали газа
const gasPedal = document.getElementById('gas-pedal');

if (gasPedal) {
    gasPedal.addEventListener('pointerdown', () => {
        gas = true;
        gameState.isGasPressed = true;
        gasPedal.classList.add('pressed');
    });

    gasPedal.addEventListener('pointerup', () => {
        gas = false;
        gameState.isGasPressed = false;
        gasPedal.classList.remove('pressed');
    });

    // Также обрабатываем события "pointerleave", чтобы педаль не оставалась нажатой, если курсор покидает элемент
    gasPedal.addEventListener('pointerleave', () => {
        gas = false;
        gameState.isGasPressed = false;
        gasPedal.classList.remove('pressed');
    });
}

// Обработчики нажатия кнопок "gear-up" и "gear-down"
const gearUpButton = document.querySelector('button[name="gear-up"]');
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
    // Инициализируем gearRatios на основе начальных значений слайдеров
    if (index < gameState.gearRatios.length - 1) {
        gameState.gearRatios[index + 1] = 1 / Number.parseInt(gearControl.value, 10);
    }

    gearControl.addEventListener('input', function () {
        let value = Number.parseInt(this.value, 10);
        const minValue = Number.parseInt(this.dataset.min, 10) || 1;
        const maxValue = Number.parseInt(this.dataset.max, 10) || 100;

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
            gearControls[index - 1].dataset.max = value - 1;
        }
        if (index < gearControls.length - 1) {
            gearControls[index + 1].dataset.min = value + 1;
        }

        // Обновляем коэффициент передачи
        gameState.gearRatios[index + 1] = 1 / value;
        this.nextElementSibling.textContent = `1/${value}`;

        console.log(`Коэффициент передачи ${index + 1}: 1/${value}`);
    });
});

/**
 * Обработчик нажатия кнопки "Повысить передачу"
 */
function handleGearUp() {
    if (gameState.currentGear < 6) { // Предполагаем максимум 6 передач
        // Проверить условия переключения (например, RPM в допустимом диапазоне и не нажат газ)
        if (!gas && gameState.rpm > 1500 && gameState.rpm < 6500) {
            gameState.currentGear += 1;
            console.log(`Передача переключена на ${gameState.currentGear}`);
            // Если есть соответствующий контрол, обновим его
            const currentGearControl = gearControls[gameState.currentGear - 1];
            if (currentGearControl) {
                currentGearControl.value = gameState.currentGear;
                updateGear(gameState.currentGear);
            } else {
                updateGear(gameState.currentGear);
            }
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
    if (gameState.currentGear > 1) { // Минимум первая передача
        // Проверить условия переключения (например, RPM в допустимом диапазоне и не нажат газ)
        if (!gas && gameState.rpm > 1500 && gameState.rpm < 6500) {
            gameState.currentGear -= 1;
            console.log(`Передача переключена на ${gameState.currentGear}`);
            // Если есть соответствующий контрол, обновим его
            const currentGearControl = gearControls[gameState.currentGear - 1];
            if (currentGearControl) {
                currentGearControl.value = gameState.currentGear;
                updateGear(gameState.currentGear);
            } else {
                updateGear(gameState.currentGear);
            }
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
    gameState.currentGear = 1;
    gameState.rpm = MIN_RPM;
    gameState.speed = 0;
    gameState.position = 0;
    gameState.timeElapsed = 0;
    gameState.hasFinished = false;

    // Обновить UI
    updateRpm(gameState.rpm);
    updateKmh(gameState.speed);
    updateGear(gameState.currentGear);

    // Запустить гонку через 3 секунды
    setTimeout(() => {
        gameState.isRaceStarted = true;
        console.log('Гонка началась!');
    }, 3000);
}

/**
 * Основной цикл обновления физики
 * @param {number} deltaTime - Время, прошедшее с последнего обновления (в секундах)
 */
function updatePhysics(deltaTime) {
    if (gameState.isGasPressed) {
        // Если педаль газа нажата, увеличиваем RPM
        gameState.rpm += RPM_INCREASE_RATE * deltaTime;

        // Ограничиваем RPM до максимального значения
        if (gameState.rpm > MAX_RPM) {
            gameState.rpm = MAX_RPM;
        }
    } else {
        // Если педаль газа не нажата, уменьшаем RPM
        gameState.rpm -= RPM_DECREASE_RATE * deltaTime;

        // Ограничиваем RPM до минимального значения
        if (gameState.rpm < MIN_RPM) {
            gameState.rpm = MIN_RPM;
        }
    }

    // Обновление скорости автомобиля на основе RPM и передачи
    const gearRatio = gameState.gearRatios[gameState.currentGear]; // Коэффициент передачи
    const maxSpeedPerGear = 100 * gearRatio; // Максимальная скорость для текущей передачи (например, 100 км/ч на первой передаче)

    // Расчет скорости пропорционально RPM и передаче
    gameState.speed = ((gameState.rpm - MIN_RPM) / (MAX_RPM - MIN_RPM)) * maxSpeedPerGear;

    // Обновление позиции автомобиля
    gameState.position += gameState.speed * deltaTime;

    // Обновление времени гонки
    gameState.timeElapsed += deltaTime;

    // Обновление UI
    updateRpm(gameState.rpm);
    updateKmh(gameState.speed);

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

// Запуск игры
function startGame() {
    initRace();
    gameLoop();
}

// Запуск игры при загрузке страницы
window.addEventListener('load', startGame);
