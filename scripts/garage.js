// garage.js

// Инициализация сцены, камеры и рендерера
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x333333, 0.07);

var isRace = false;




// Настройка камеры
const camera = new THREE.PerspectiveCamera(
  85, // Угол обзора
  window.innerWidth / window.innerHeight, // Соотношение сторон
  0.1, // Ближняя плоскость отсечения
  1000 // Дальняя плоскость отсечения
);
camera.position.set(-2.5, .8, 4);
camera.rotation.set(-0., .65, 0);



// Предполагается, что у вас уже есть основная камера, например:
const mainCamera = camera; // Ваша основная камера

// Создаём дублированную камеру
const mirroredCamera = mainCamera.clone();

// Отражаем камеру по вертикальной оси (ось Y)
mirroredCamera.scale.y = -1;

// Обновляем матрицы камеры после изменения масштаба
mirroredCamera.updateProjectionMatrix();
mirroredCamera.updateMatrixWorld();


const reflectionRenderTarget = new THREE.WebGLRenderTarget(512, 512, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
});




// Переменная для контроля вращения камеры
let cameraControlled = true;

// Настройка CubeCamera для отражений
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter
});
const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
cubeCamera.position.y = 0.1;
scene.add(cubeCamera);


document.onkeydown = checkKey;

function checkKey(e) {

    e = e || window.event;



    if (e.keyCode == 38) {
      cubeCamera.position.y+= .1;
        // up arrow
    }
    else if (e.keyCode == 40) {
      cubeCamera.position.y-= .1;
        // down arrow
    }
    else if (e.keyCode == 37) {
      carDefaultPaintMaterial.envMapIntensity -=.1;
       // left arrow
    }
    else if (e.keyCode == 39) {
      carDefaultPaintMaterial.envMapIntensity +=.1;
       // right arrow
    }
    console.log('pos y: '+cubeCamera.position.y+ ', intens: ' + carDefaultPaintMaterial.envMapIntensity);
}


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

// Переменная для монет игрока
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
    const categoryButton = document.createElement('button');
    categoryButton.classList.add('upgrade-category');
    categoryButton.textContent = category.type;
    categoryButton.dataset.categoryIndex = index;
    categoryButton.setAttribute('aria-controls', `grades-${index}`);
    categoryButton.setAttribute('role', 'tab');

    // Добавить обработчик клика
    categoryButton.addEventListener('click', () => {
      setActiveCategory(categoryButton, upgrades);
    });

    categoriesContainer.appendChild(categoryButton);
  });

  // Автоматически выбрать первую категорию
  const firstCategory = categoriesContainer.querySelector('.upgrade-category');
  if (firstCategory) {
    setActiveCategory(firstCategory, upgrades);
  }
}

// Функция для установки активной категории
function setActiveCategory(selectedButton, upgrades) {
  const categories = document.querySelectorAll('.upgrade-category');
  categories.forEach(cat => {
    cat.classList.remove('active');
    cat.setAttribute('aria-selected', 'false');
  });

  selectedButton.classList.add('active');
  selectedButton.setAttribute('aria-selected', 'true');

  const selectedIndex = selectedButton.dataset.categoryIndex;
  const selectedCategory = upgrades[selectedIndex];
  
  renderGrades(selectedCategory.grades);
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

// Функция для применения краски к автомобилю
function applyPaint(color) {
  if (!carDefaultPaintMaterial) {
    console.error('carDefaultPaintMaterial не определён.');
    return;
  }

  if (color === 'map') {
    carDefaultPaintMaterial.map = carBodyTexture; // Включаем карту текстуры
    carDefaultPaintMaterial.color.set(0xffffff); // Белый цвет, так как карта используется
  } else {
    carDefaultPaintMaterial.map = null; // Отключаем карту
    carDefaultPaintMaterial.color.setHex(color);
  }
  carDefaultPaintMaterial.needsUpdate = true;

  /* // Обновить материал на модели автомобиля
  if (carModel) {
    carModel.traverse(child => {
      if (child.isMesh) {
        child.material = carDefaultPaintMaterial;
      }
    });
  } */

  console.log(`Краска автомобиля изменена на: ${color === 'map' ? 'Текстурированный' : `#${color.toString(16)}`}`);
}

// Функция для применения металлика к автомобилю
function applyMetallic(met) {
  if (!carDefaultPaintMaterial) {
    console.error('carDefaultPaintMaterial не определён.');
    return;
  }

  switch (met) {
    case 'gl':
      carDefaultPaintMaterial.metalness = 0.3;
      carDefaultPaintMaterial.clearCoat = 0.7;
      carDefaultPaintMaterial.envMapIntensity = 1.5;
      break;
    case 'met':
      carDefaultPaintMaterial.metalness = 0.5;
      carDefaultPaintMaterial.clearCoat = 0.9;
      carDefaultPaintMaterial.envMapIntensity = 3.5;
      break;
    case 'mat':
      carDefaultPaintMaterial.metalness = 0.0;
      carDefaultPaintMaterial.clearCoat = 0.1;
      carDefaultPaintMaterial.envMapIntensity = 0.5;
      break;
    default:
      console.warn('Неизвестный тип металлика:', met);
  }
  carDefaultPaintMaterial.needsUpdate = true;

  console.log(`Металлик автомобиля изменён на: ${met}`);
}

// Функция для применения цвета тонировки к стеклам
function applyTintColor(color) {
  if (!carGlassMaterial) {
    console.error('carGlassMaterial не определён.');
    return;
  }

  carGlassMaterial.color.setHex(color);
  carGlassMaterial.needsUpdate = true;

  console.log(`Цвет тонировки изменён на: #${color.toString(16)}`);
}

// Функция для применения степени тонировки (прозрачности) к стеклам
function applyTintOpacity(opacity) {
  if (!carGlassMaterial) {
    console.error('carGlassMaterial не определён.');
    return;
  }

  carGlassMaterial.opacity = opacity;
  carGlassMaterial.transparent = opacity < 1.0;
  carGlassMaterial.needsUpdate = true;

  console.log(`Степень тонировки изменена на: ${opacity}`);
}

// Функция для применения цвета дисков
function applyWheelColor(color) {
  if (!wheelMaterial) {
    console.error('wheelMaterial не определён.');
    return;
  }

  wheelMaterial.color.setHex(color);
  wheelMaterial.needsUpdate = true;

  console.log(`Цвет дисков изменён на: #${color.toString(16)}`);
}



// Функция для инициализации меню тюнинга и действий
function initializeMenuActions() {
  // Инициализация открытия и закрытия меню тюнинга
  const tuningButton = document.getElementById('open-tuning');
  const closeTuningButton = document.getElementById('close-tuning');
  const tuningMenu = document.getElementById('tuning-menu');

  tuningButton.addEventListener('click', openTuningMenu);
  closeTuningButton.addEventListener('click', closeTuningMenu);

  // Обработчик кнопки "Гонка"
  const raceButton = document.getElementById('start-race');
  raceButton.addEventListener('click', () => {
    cameraControlled = false;
    const raceGui = document.querySelector('.race-gui');
    if (raceGui) {
      raceGui.classList.add('show');
      raceGui.classList.remove('hide');
    }
    gsap.to(garage.scale, { x: 0, y: 0, duration: 0.1 });
    document.getElementById('action-menu').style.display = 'none';
    gsap.to(camera.position, { x: -2, y: 3, z: -5, duration: 1.5 });
    gsap.to(camera.rotation, { x: 0.5,y: Math.PI + .4, z:0.4, duration: 1 });
    scene.fog = new THREE.FogExp2(0x333356, 0.02);
    loadRace(scene);
    startRace();
    renderer.toneMapping = THREE.ReinhardToneMapping ;
    renderer.toneMappingExposure = 4.5;
    isRace = true;
    // front.scale.set(1, 1, 1); // Раскомментируйте при необходимости
  });

  // Обработчики для основных вкладок "Тюнинг", "Детейлинг" и "Стайлинг"
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

  // **Логика для вкладки "Детейлинг"**

  // Обработчики для суб-вкладок Детейлинга
  const detailingSubtabs = document.querySelectorAll('.detailing-subtab');
  detailingSubtabs.forEach(subtab => {
    subtab.addEventListener('click', () => {
      // Удалить класс active у всех суб-вкладок
      detailingSubtabs.forEach(st => {
        st.classList.remove('active');
        st.setAttribute('aria-selected', 'false');
      });

      // Добавить класс active к выбранной суб-вкладке
      subtab.classList.add('active');
      subtab.setAttribute('aria-selected', 'true');

      const selectedSubtab = subtab.dataset.subtab;

      // Показать соответствующий субконтейнер опций и скрыть остальные
      const detailingSubcontents = document.querySelectorAll('.detailing-subcontent');
      detailingSubcontents.forEach(subcontent => {
        if (subcontent.dataset.subtabContent === selectedSubtab) {
          subcontent.classList.add('active');
          subcontent.removeAttribute('hidden');
        } else {
          subcontent.classList.remove('active');
          subcontent.setAttribute('hidden', '');
        }
      });
    });
  });

  // **Обработчики для опций детайлнинга**

  // Краска
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

  // Тип краски
  const metOptions = document.querySelectorAll('.metallic-option');
  metOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedMet = option.dataset.met;
      applyMetallic(selectedMet);
      // Добавляем визуальный индикатор выбранной опции металлика
      metOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });

  // Тонировка стекол - Цвет
  const tintColorOptions = document.querySelectorAll('.tint-color-option');
  tintColorOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedColor = option.dataset.color;
      applyTintColor(selectedColor);

      // Добавляем визуальный индикатор выбранной опции
      tintColorOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });

  // Тонировка стекол - Степень
  const tintOpacitySlider = document.getElementById('tint-opacity');
  tintOpacitySlider.addEventListener('input', () => {
    const selectedOpacity = parseFloat(tintOpacitySlider.value);
    applyTintOpacity(selectedOpacity);
  });

  // Цвет дисков
  const wheelColorOptions = document.querySelectorAll('.wheel-color-option');
  wheelColorOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedColor = option.dataset.color;
      applyWheelColor(selectedColor);

      // Добавляем визуальный индикатор выбранной опции
      wheelColorOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });
}







// Получение информации о пользователе и отображение приветствия
let username = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.username : 'guest';
document.getElementById('greeting').innerHTML = `Привет, <span class="gradient-text"> ${username}</span>`;

// Настройка рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping ;
renderer.toneMappingExposure = 4.5;
//renderer.setPixelRatio(window.devicePixelRatio); // Улучшение качества
document.getElementById('garage-container').appendChild(renderer.domElement);

// Добавление света
const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.castShadow = true;
directionalLight.position.set(0, 2, 0);
//Set up shadow properties for the light
directionalLight.shadow.mapSize.width = 512; // default
directionalLight.shadow.mapSize.height = 512; // default
directionalLight.shadow.camera.near = 0.5; // default
directionalLight.shadow.camera.far = 500; // default
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

  mirroredCamera.aspect = width/height;
  mirroredCamera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize, false);

// Переменные для управления камерой
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };

const rotationSpeed = 0.005;
const dampingFactor = 0.95;

// Ограничения для вертикального угла (в радианах)
const minPolarAngle = Math.PI / 3; // 30 градусов
const maxPolarAngle = Math.PI / 2; // 90 градусов

// Обработчики событий мыши
renderer.domElement.addEventListener('mousedown', function(event) {
  animateFOV(55);
  isDragging = true;
  previousMousePosition = { x: event.clientX, y: event.clientY };
  velocity = { x: 0, y: 0 }; // Сбрасываем скорость
});

renderer.domElement.addEventListener('mouseup', function(event) {
  animateFOV(85);
  isDragging = false;
});

renderer.domElement.addEventListener('mousemove', function(event) {
  
  if (isDragging && cameraControlled) {
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    const deltaAzimuthAngle = deltaX * rotationSpeed;
    const deltaPolarAngle = deltaY * rotationSpeed;

    rotateCamera(deltaAzimuthAngle, deltaPolarAngle);

    // Обновляем скорость для инерции
    velocity.x = deltaAzimuthAngle;
    velocity.y = deltaPolarAngle;

    

    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
});


// Функция для анимации изменения FOV
function animateFOV(targetFOV) {
  gsap.to(camera, {
      fov: targetFOV,
      duration: 0.5, // Продолжительность анимации в секундах
      ease: "power2.out",
      onUpdate: () => {
          camera.updateProjectionMatrix();
      }
  });
  gsap.to(mirroredCamera, {
    fov: targetFOV,
    duration: 0.5, // Продолжительность анимации в секундах
    ease: "power2.out",
    onUpdate: () => {
        camera.updateProjectionMatrix();
    }
});
}



// Обработка сенсорных событий для touch-устройств
renderer.domElement.addEventListener('touchstart', function(event) {
  animateFOV(55);
  if (!cameraControlled) return;
  if (event.touches.length === 1) {
    isDragging = true;
    previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    velocity = { x: 0, y: 0 }; // Сбрасываем скорость
  }
});

renderer.domElement.addEventListener('touchmove', function(event) {
  if (isDragging && cameraControlled && event.touches.length === 1) {
    const deltaX = event.touches[0].clientX - previousMousePosition.x;
    const deltaY = event.touches[0].clientY - previousMousePosition.y;

    const deltaAzimuthAngle = deltaX * rotationSpeed;
    const deltaPolarAngle = deltaY * rotationSpeed;

    rotateCamera(deltaAzimuthAngle, deltaPolarAngle);

    // Обновляем скорость для инерции
    velocity.x = deltaAzimuthAngle;
    velocity.y = deltaPolarAngle;
    
    previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
});

renderer.domElement.addEventListener('touchend', function(event) {
  animateFOV(85);
  isDragging = false;
});

// Функция для вращения камеры с учетом ограничений
function rotateCamera(deltaAzimuthAngle, deltaPolarAngle) {
  const offset = camera.position.clone().sub(target);

  // Преобразуем смещение в сферические координаты
  const spherical = new THREE.Spherical();
  spherical.setFromVector3(offset);
  
  // Применяем вращения
  spherical.theta -= deltaAzimuthAngle; // Азимутальный угол
  spherical.phi -= deltaPolarAngle;     // Полярный угол

  // Ограничиваем полярный угол
  const EPS = 0.000001;
  spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));
  spherical.makeSafe(); // Обеспечиваем, что phi находится в допустимом диапазоне

  // Преобразуем обратно в декартовы координаты
  offset.setFromSpherical(spherical);
  
  camera.position.copy(target.clone().add(offset));
  camera.lookAt(target);
}

// Анимация
var target = new THREE.Vector3(0, 0, 0); // Точка, вокруг которой вращается камера
camera.lookAt(target);

function animate() {
  requestAnimationFrame(animate);

  // Обновление cubeCamera для динамических отражений
  if (body) {
    // Временно скрываем объект body для обновления отражений
    body.visible = false;

    // Обновляем cubeCamera
    
    cubeCamera.update(renderer, scene);

    // Возвращаем видимость объекта body
    body.visible = true;
  }

  // Обновление mirroredCamera для фейковых отражений пола
  if (garageFloor && !isRace) {
    // Временно скрываем пол, чтобы он не отображался в отражении
    garageFloor.visible = false;

    // Синхронизируем позицию и ориентацию mirroredCamera с основной камерой
    mirroredCamera.position.copy(mainCamera.position);
    mirroredCamera.quaternion.copy(mainCamera.quaternion);

    // Инвертируем Y-позицию камеры относительно пола
    // Предполагается, что пол находится на Y = 0
    mirroredCamera.position.y = -mainCamera.position.y;

    // Обновляем матрицы мира и проекции mirroredCamera
    mirroredCamera.updateMatrixWorld();
    mirroredCamera.updateProjectionMatrix();

    mirroredCamera.lookAt(target);

    // Рендерим сцену с mirroredCamera в Render Target
    renderer.setRenderTarget(reflectionRenderTarget);
    renderer.render(scene, mirroredCamera);
    renderer.setRenderTarget(null);

    // Возвращаем видимость пола
    garageFloor.visible = true;
  }
  
  // Управление камерой (инерция и вращение)
  if (cameraControlled) {
    if (!isDragging) {
      // Применяем инерцию только если палец/мышь не взаимодействуют
      if (velocity.x !== 0 || velocity.y !== 0) {
        rotateCamera(velocity.x, velocity.y);

        // Применяем демпфирование
        velocity.x *= dampingFactor;
        velocity.y *= dampingFactor;
        

        // Останавливаем вращение, если скорость очень мала
        if (Math.abs(velocity.x) < 0.00001) velocity.x = 0;
        if (Math.abs(velocity.y) < 0.00001) velocity.y = 0;
      }
    }
  }

  // Рендерим основную сцену с основной камерой
  renderer.render(scene, mainCamera);
}
animate();


