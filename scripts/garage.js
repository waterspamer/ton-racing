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
  tuningMenu.classList.add('visible');
  fetchUpgrades();
}

// Функция для закрытия меню тюнинга
function closeTuningMenu() {
  const tuningMenu = document.getElementById('tuning-menu');
  tuningMenu.classList.remove('visible');
}

// Функция для загрузки данных улучшений из upgrades.json
async function fetchUpgrades() {
  try {
    const response = await fetch('/upgrades.json');
    if (!response.ok) throw new Error('Не удалось загрузить upgrades.json');
    const data = await response.json();
    renderUpgrades(data.upgrades);
  } catch (error) {
    console.error('Ошибка при загрузке улучшений:', error);
  }
}

// Функция для рендеринга улучшений в меню тюнинга
function renderUpgrades(upgrades) {
  const tuningContent = document.querySelector('#tuning-menu .tuning-content');
  tuningContent.innerHTML = ''; // Очистить предыдущее содержимое

  upgrades.forEach(category => {
    // Создать контейнер для категории
    const categoryDiv = document.createElement('div');
    categoryDiv.classList.add('category');

    // Добавить заголовок категории
    const categoryTitle = document.createElement('h3');
    categoryTitle.textContent = category.type;
    categoryDiv.appendChild(categoryTitle);

    // Перебрать грейды в категории
    category.grades.forEach(upgrade => {
      // Создать контейнер для улучшения
      const upgradeDiv = document.createElement('div');
      upgradeDiv.classList.add('upgrade');

      // Создать секцию деталей улучшения
      const detailsDiv = document.createElement('div');
      detailsDiv.classList.add('upgrade-details');

      // Название улучшения
      const name = document.createElement('div');
      name.classList.add('upgrade-name');
      name.textContent = `${upgrade.name} (Грейд ${upgrade.grade})`;
      detailsDiv.appendChild(name);

      // Описание улучшения
      const description = document.createElement('div');
      description.classList.add('upgrade-description');
      description.textContent = upgrade.description;
      detailsDiv.appendChild(description);

      // Цена улучшения
      const price = document.createElement('div');
      price.classList.add('upgrade-price');
      price.textContent = `Цена: ${upgrade.price} монет`;
      detailsDiv.appendChild(price);

      upgradeDiv.appendChild(detailsDiv);

      // Кнопка покупки
      const purchaseButton = document.createElement('button');
      purchaseButton.classList.add('purchase-button');
      purchaseButton.textContent = 'Купить';
      purchaseButton.dataset.upgradeType = category.type;
      purchaseButton.dataset.upgradeGrade = upgrade.grade;

      // Добавить обработчик события для покупки
      purchaseButton.addEventListener('click', () => handlePurchase(upgrade));

      upgradeDiv.appendChild(purchaseButton);

      // Добавить улучшение в категорию
      categoryDiv.appendChild(upgradeDiv);
    });

    // Добавить категорию в содержимое меню
    tuningContent.appendChild(categoryDiv);
  });
}

// Функция для обработки покупки улучшения
function handlePurchase(upgrade) {
  if (playerCoins >= upgrade.price) {
    playerCoins -= upgrade.price;
    applyUpgrade(upgrade);
    alert(`Вы успешно купили ${upgrade.name} (Грейд ${upgrade.grade})!`);
    updateCoinsDisplay();
  } else {
    alert('Недостаточно монет для покупки этого улучшения.');
  }
}

// Функция для применения улучшения к автомобилю
function applyUpgrade(upgrade) {
  if (upgrade.changes.gripCoefficient) {
    car.gripCoefficient += upgrade.changes.gripCoefficient;
  }
  if (upgrade.changes.dragCoefficient) {
    car.dragCoefficient += upgrade.changes.dragCoefficient;
  }
  if (upgrade.changes.downforce) {
    car.downforce += upgrade.changes.downforce;
  }
  if (upgrade.changes.powerIncreasePercentage) {
    car.power *= (1 + upgrade.changes.powerIncreasePercentage);
  }
  if (upgrade.changes.torqueIncreasePercentage) {
    car.torque *= (1 + upgrade.changes.torqueIncreasePercentage);
  }
  if (upgrade.changes.maxRPMIncrease) {
    car.maxRPM += upgrade.changes.maxRPMIncrease;
  }
  if (upgrade.changes.throttleResponse) {
    car.throttleResponse += upgrade.changes.throttleResponse;
  }
  if (upgrade.changes.shiftSpeedIncreasePercentage) {
    car.shiftSpeed *= (1 + upgrade.changes.shiftSpeedIncreasePercentage);
  }
  if (upgrade.changes.clutchDurability) {
    car.clutchDurability += upgrade.changes.clutchDurability;
  }
  if (upgrade.changes.gearRatiosOptimized) {
    car.gearRatiosOptimized = true;
  }
  if (upgrade.changes.allowShiftWithoutClutch) {
    car.allowShiftWithoutClutch = true;
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

  // Обработчик кнопки "Гонка"
  const raceButton = document.getElementById('start-race');
  raceButton.addEventListener('click', () => {
    gsap.to(garage.scale, { x: 0, y: 0, duration: .1 });
    document.getElementById('action-menu').style.display = 'none';
    gsap.to(camera.position, {x: -2, y : 3, z: -5, duration: 1.5});
    loadRace(scene);
    //front.scale.set(1, 1, 1);
  });
}

// Обработка событий мыши и сенсорных устройств (оставлено без изменений)
let target = new THREE.Vector3(0, 0, 0); // Точка, вокруг которой вращается камера
camera.lookAt(target);

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
  carDefaultPaintMaterial = carModel.material;
  canRenderBody = true;
  // После загрузки автомобиля можно выполнить дополнительные действия
});

// Инициализация меню действий после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  initializeMenuActions();
  updateCoinsDisplay();
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
