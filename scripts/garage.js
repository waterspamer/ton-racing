// garage.js

// Инициализация сцены, камеры и рендерера
const scene = new THREE.Scene();

// Настройка камеры
const camera = new THREE.PerspectiveCamera(
  75, // Угол обзора
  window.innerWidth / window.innerHeight, // Соотношение сторон
  0.1, // Ближняя плоскость отсечения
  1000 // Дальняя плоскость отсечения
);
camera.position.set(2.5, 1, 4);
camera.rotation.set(-0., .65, 0);

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter
});

const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
cubeCamera.position.y = 3;
scene.add(cubeCamera);

// Инициализация Telegram Web Apps
let tg = window.Telegram.WebApp;

// Установка приложения в полноэкранный режим
tg.expand();
tg.disableVerticalSwipes(); 

// Обработчик кнопки подключения Telegram
document.querySelector('.tg-button').addEventListener('click', () => {
  document.getElementById('garage-menu').classList.add('hide');
  document.getElementById('action-menu').style.display = '';
});

// Инициализация переменных для 3D-моделей
//let front, back, carDefaultPaintMaterial, garage, body;

// Предполагаемый объект автомобиля
let car = {
  gripCoefficient: 1.0,
  dragCoefficient: 0.3,
  downforce: 0.0,
  power: 200, // л.с.
  torque: 300, // Нм
  maxRPM: 7000,
  throttleResponse: 1.0,
  shiftSpeed: 1.0,
  clutchDurability: 1.0,
  gearRatiosOptimized: false,
  allowShiftWithoutClutch: false,
  // ... другие параметры
};

// Предполагаемая переменная для монет игрока
let playerCoins = 5000; // Начальное количество монет

// Инициализация меню тюнинга
function initializeTuningMenu() {
  const tuningButton = document.getElementById('open-tuning');
  const closeTuningButton = document.getElementById('close-tuning');
  const tuningMenu = document.getElementById('tuning-menu');

  tuningButton.addEventListener('click', openTuningMenu);
  closeTuningButton.addEventListener('click', closeTuningMenu);
}

// Функция для открытия меню тюнинга
function openTuningMenu() {
  const tuningMenu = document.getElementById('tuning-menu');
  //document.getElementById('garage-container').addEventListener('click', ()=>closeTuningMenu());
  tuningMenu.classList.add('visible');
  const carStatsWindow = document.getElementById('car-stats-window');
  carStatsWindow.classList.remove('hidden'); // Отображаем окно характеристик
  fetchUpgrades();
}

// Функция для закрытия меню тюнинга
function closeTuningMenu() {
  const tuningMenu = document.getElementById('tuning-menu');
  tuningMenu.classList.remove('visible');
  const carStatsWindow = document.getElementById('car-stats-window');
  carStatsWindow.classList.add('hidden'); // Скрываем окно характеристик
}

// Функция для загрузки данных улучшений из upgrades.json
async function fetchUpgrades() {
  try {
    const response = await fetch('upgrades.json'); // Относительный путь
    if (!response.ok) throw new Error('Не удалось загрузить upgrades.json');
    const data = await response.json();
    renderCategories(data.upgrades);
  } catch (error) {
    console.error('Ошибка при загрузке улучшений:', error);
    alert('Не удалось загрузить данные улучшений. Пожалуйста, попробуйте позже.');
  }
}

// Функция для рендеринга категорий улучшений
function renderCategories(upgrades) {
  const categoriesContainer = document.getElementById('upgrade-categories');
  categoriesContainer.innerHTML = ''; // Очистить предыдущие категории

  upgrades.forEach((category, index) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.classList.add('upgrade-category');
    categoryDiv.textContent = category.type;
    categoryDiv.dataset.categoryIndex = index;

    // Добавить обработчик клика
    categoryDiv.addEventListener('click', () => {
      // Убрать класс active с других категорий
      document.querySelectorAll('.upgrade-category').forEach(cat => cat.classList.remove('active'));
      // Добавить класс active к выбранной категории
      categoryDiv.classList.add('active');
      // Рендер грейдов выбранной категории
      renderGrades(category.grades);
    });

    categoriesContainer.appendChild(categoryDiv);
  });

  // Автоматически выбрать первую категорию
  const firstCategory = categoriesContainer.querySelector('.upgrade-category');
  if (firstCategory) {
    firstCategory.classList.add('active');
    const firstIndex = firstCategory.dataset.categoryIndex;
    renderGrades(upgrades[firstIndex].grades);
  }
}

// Функция для рендеринга грейдов улучшений
function renderGrades(grades) {
  const gradesContainer = document.getElementById('upgrade-grades');
  gradesContainer.innerHTML = ''; // Очистить предыдущие грейды

  grades.forEach(upgrade => {
    const gradeDiv = document.createElement('div');
    gradeDiv.classList.add('upgrade-grade');

    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('upgrade-details');

    const name = document.createElement('div');
    name.classList.add('upgrade-name');
    name.textContent = `${upgrade.name} (Грейд ${upgrade.grade})`;
    detailsDiv.appendChild(name);

    const description = document.createElement('div');
    description.classList.add('upgrade-description');
    description.textContent = upgrade.description;
    detailsDiv.appendChild(description);

    const price = document.createElement('div');
    price.classList.add('upgrade-price');
    price.textContent = `Цена: ${upgrade.price} монет`;
    detailsDiv.appendChild(price);

    gradeDiv.appendChild(detailsDiv);

    const purchaseButton = document.createElement('button');
    purchaseButton.classList.add('purchase-button');
    purchaseButton.textContent = 'Купить';

    // Добавить обработчик события для покупки
    purchaseButton.addEventListener('click', () => handlePurchase(upgrade));

    gradeDiv.appendChild(purchaseButton);

    gradesContainer.appendChild(gradeDiv);
  });
}

// Функция для обработки покупки улучшения
function handlePurchase(upgrade) {
  if (playerCoins >= upgrade.price) {
    playerCoins -= upgrade.price;
    applyUpgrade(upgrade);
    alert(`Вы успешно купили ${upgrade.name} (Грейд ${upgrade.grade})!`);
    updateCoinsDisplay();
    updateCarStats();
  } else {
    alert('Недостаточно монет для покупки этого улучшения.');
  }
}

// Функция для применения улучшения к автомобилю
function applyUpgrade(upgrade) {
  // Обход изменений и обновление параметров автомобиля
  for (let key in upgrade.changes) {
    if (upgrade.changes.hasOwnProperty(key)) {
      if (typeof car[key] === 'number') {
        car[key] += upgrade.changes[key];
      } else if (typeof car[key] === 'boolean') {
        car[key] = upgrade.changes[key];
      }
      // Добавьте другие типы данных при необходимости
    }
  }

  // Обновить параметры автомобиля в игре
  updateCarParameters();
}

// Функция для обновления отображения монет
function updateCoinsDisplay() {
  const coinsElement = document.getElementById('coins-display');
  if (coinsElement) {
    coinsElement.textContent = `Монеты: ${playerCoins}`;
  }
}

// Функция для обновления отображения характеристик машины
function updateCarStats() {
  // Предполагаем, что максимальные значения:
  const maxPower = 1000; // Пример
  const maxTorque = 1000; // Пример
  const maxGrip = 2.0; // Пример
  const minDrag = -1.0; // Пример (чем ниже, тем лучше)

  // Расчёт процентов для заполнения полос
  const powerPercent = Math.min((car.power / maxPower) * 100, 100);
  const torquePercent = Math.min((car.torque / maxTorque) * 100, 100);
  const gripPercent = Math.min((car.gripCoefficient / maxGrip) * 100, 100);
  const dragPercent = Math.min(((0.3 + car.dragCoefficient) / (0.3 + Math.abs(minDrag))) * 100, 100); // Пример расчёта

  document.getElementById('stat-power').style.width = `${powerPercent}%`;
  document.getElementById('stat-torque').style.width = `${torquePercent}%`;
  document.getElementById('stat-grip').style.width = `${gripPercent}%`;
  document.getElementById('stat-drag').style.width = `${100 - dragPercent}%`; // Чем меньше сопротивление, тем больше заполнение
}

// Функция для обновления параметров автомобиля в игре
function updateCarParameters() {
  // Реализуйте обновление параметров автомобиля в соответствии с объектом car
  // Например, обновить физику движения, визуальные параметры и т.д.
  console.log('Параметры автомобиля обновлены:', car);
}

// Функция для инициализации меню тюнинга и действий
function initializeMenuActions() {
  // Инициализация меню тюнинга
  initializeTuningMenu();

  // Обработчики для вкладок "Тюнинг" и "Детейлинг"
  const tuningTabs = document.querySelectorAll('.tuning-tab');
  tuningTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Удалить класс active у всех вкладок
      tuningTabs.forEach(t => t.classList.remove('active'));
      // Добавить класс active к выбранной вкладке
      tab.classList.add('active');

      const selectedTab = tab.dataset.tab;

      // Показать соответствующий контент
      document.querySelectorAll('.tab-content').forEach(content => {
        if (content.dataset.tabContent === selectedTab) {
          content.style.display = '';
        } else {
          content.style.display = 'none';
        }
      });
    });
  });

  // Обработчики для опций краски
  const paintOptions = document.querySelectorAll('.paint-option');
  paintOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedColor = option.dataset.color;
      applyPaint(selectedColor);
    });
  });
}

// Получение информации о пользователе и отображение приветствия
let username = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.username : 'guest';
document.getElementById('greeting').innerHTML = `Привет, <span class="gradient-text"> ${username}</span>`;

// Настройка рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.setPixelRatio(window.devicePixelRatio); // Улучшение качества
document.getElementById('garage-container').appendChild(renderer.domElement);

// Добавление света
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 5, 7.5);
//scene.add(directionalLight);

// Загрузка моделей
loadGarage(scene);

// Загрузка модели автомобиля
loadCarModel(scene, function(carModel) {
  //carDefaultPaintMaterial = carModel.material; // Используем объявленную в другом файле переменную
  canRenderBody = true;
  // После загрузки автомобиля можно выполнить дополнительные действия
});

// Инициализация меню действий после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  initializeMenuActions();
  updateCoinsDisplay();
  updateCarStats(); // Отображение начальных характеристик
});

// Функция обновления размеров окна
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize, false);

// Переменные для управления камерой
let isMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };

// Параметры вращения камеры
let rotationSpeed = 0.005;

// Обработчики событий мыши
renderer.domElement.addEventListener('mousedown', function(event) {
  isMouseDown = true;
  previousMousePosition = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('mouseup', function(event) {
  isMouseDown = false;
});

renderer.domElement.addEventListener('mousemove', function(event) {
  if (isMouseDown) {
    let deltaX = event.clientX - previousMousePosition.x;
    let deltaY = event.clientY - previousMousePosition.y;

    let rotationMatrix = new THREE.Matrix4();

    // Вращение вокруг оси Y (вертикальная ось)
    rotationMatrix.makeRotationY(-deltaX * rotationSpeed);
    camera.position.applyMatrix4(rotationMatrix);

    // Вращение вокруг оси X (горизонтальная ось)
    let axis = new THREE.Vector3(0, 1, 0);
    axis.cross(camera.position.clone().sub(target)).normalize();
    rotationMatrix.makeRotationAxis(axis, -deltaY * rotationSpeed);
    camera.position.applyMatrix4(rotationMatrix);

    // Обновляем направление камеры на цель
    camera.lookAt(target);

    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
});

// Обработка сенсорных событий для touch-устройств
renderer.domElement.addEventListener('touchstart', function(event) {
  if (event.touches.length === 1) {
    isMouseDown = true;
    previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
});

renderer.domElement.addEventListener('touchmove', function(event) {
  if (isMouseDown && event.touches.length === 1) {
    let deltaX = event.touches[0].clientX - previousMousePosition.x;
    let deltaY = event.touches[0].clientY - previousMousePosition.y;

    let rotationMatrix = new THREE.Matrix4();

    // Вращение вокруг оси Y
    rotationMatrix.makeRotationY(-deltaX * rotationSpeed);
    camera.position.applyMatrix4(rotationMatrix);

    // Вращение вокруг оси X
    let axis = new THREE.Vector3(0, 1, 0);
    axis.cross(camera.position.clone().sub(target)).normalize();
    rotationMatrix.makeRotationAxis(axis, -deltaY * rotationSpeed);
    camera.position.applyMatrix4(rotationMatrix);

    // Обновляем направление камеры на цель
    camera.lookAt(target);

    previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
});

renderer.domElement.addEventListener('touchend', function(event) {
  isMouseDown = false;
});

// Анимация
let target = new THREE.Vector3(0, 0, 0); // Точка, вокруг которой вращается камера
camera.lookAt(target);

function animate() {
  requestAnimationFrame(animate);
  
  if (body) {
    // Временно скрываем объект body для обновления отражений
    body.visible = false;
    
    // Обновляем CubeCamera, чтобы захватить отражения без объекта body
    cubeCamera.update(renderer, scene);
    
    // Возвращаем объект body на место
    body.visible = true;
  }
  camera.lookAt(target);
  // Рендеринг сцены с использованием CubeCamera
  renderer.render(scene, camera);
}
animate();


// Функция для применения краски к автомобилю
function applyPaint(color) {
  if (!carDefaultPaintMaterial) {
    console.error('carDefaultPaintMaterial не определён.');
    return;
  }

  if (color === 'map') {
    carDefaultPaintMaterial.map = carBodyTexture; // Включаем карту текстуры
    //carDefaultPaintMaterial.metalness = (0.0);
    carDefaultPaintMaterial.color.set(0xffffff); // Белый цвет, так как карта используется
  } else {
    carDefaultPaintMaterial.map = null; // Отключаем карт
    //carDefaultPaintMaterial.metalness = (0.3);
    carDefaultPaintMaterial.color.setHex(color);
  }
  carDefaultPaintMaterial.needsUpdate = true;


  console.log(`Краска автомобиля изменена на: ${color === 'map' ? 'Текстурированный' : `#${color.toString(16)}`}`);
}

function applyMetallic(met) {
  if (!carDefaultPaintMaterial) {
    console.error('carDefaultPaintMaterial не определён.');
    return;
  }

  if (met === 'gl') {
    carDefaultPaintMaterial.metalness = (0.3);
    carDefaultPaintMaterial.clearCoat = 0.7;
    carDefaultPaintMaterial.envMapIntensity = 5.5;

  } else if (met === 'met') {

    carDefaultPaintMaterial.metalness = (0.5);
    carDefaultPaintMaterial.clearCoat = 0.9;
    carDefaultPaintMaterial.envMapIntensity = 10.5;

  } else if (met === 'mat') {

    carDefaultPaintMaterial.metalness = (0.0);
    carDefaultPaintMaterial.clearCoat = 0.1;
    carDefaultPaintMaterial.envMapIntensity = 1.5;

  }
  carDefaultPaintMaterial.needsUpdate = true;

}




// Функция для инициализации меню тюнинга и действий
function initializeMenuActions() {
  // Инициализация меню тюнинга
  initializeTuningMenu();

  // Обработчик кнопки "Гонка"
  const raceButton = document.getElementById('start-race');
  raceButton.addEventListener('click', () => {
    document.getElementsByClassName('race-gui')[0].classList.add('show');
    document.getElementsByClassName('race-gui')[0].classList.remove('hide');
    gsap.to(garage.scale, { x: 0, y: 0, duration: 0.1 });
    document.getElementById('action-menu').style.display = 'none';
    gsap.to(camera.position, { x: -2, y: 3, z: -5, duration: 1.5 });
    loadRace(scene);
    //front.scale.set(1, 1, 1);
  });

  // Обработчики для вкладок "Тюнинг" и "Детейлинг"
  const tuningTabs = document.querySelectorAll('.tuning-tab');
  tuningTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Удалить класс active у всех вкладок
      tuningTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      // Добавить класс active к выбранной вкладке
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const selectedTab = tab.dataset.tab;

      // Показать соответствующий контент и скрыть остальные
      document.querySelectorAll('.tab-content').forEach(content => {
        if (content.dataset.tabContent === selectedTab) {
          content.classList.add('active');
          content.removeAttribute('hidden');
          content.setAttribute('aria-hidden', 'false');
        } else {
          content.classList.remove('active');
          content.setAttribute('hidden', '');
          content.setAttribute('aria-hidden', 'true');
        }
      });
    });
  });

  // Обработчики для опций краски
  const paintOptions = document.querySelectorAll('.paint-option');
  paintOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedColor = option.dataset.color;
      applyPaint(selectedColor);
      // Добавляем визуальный индикатор выбранной краски
      paintOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });


  // Обработчики для опций металлик
  const metOptions = document.querySelectorAll('.metallic-option');
  metOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedMet = option.dataset.met;
      applyMetallic(selectedMet);
      // Добавляем визуальный индикатор выбранной краски
      metOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });
}

