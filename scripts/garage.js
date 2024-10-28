// garage.js

// Инициализация сцены, камеры и рендерера
const scene = new THREE.Scene();

// Настройка камеры
const camera = new THREE.PerspectiveCamera(
  65, // Угол обзора
  window.innerWidth / window.innerHeight, // Соотношение сторон
  0.1, // Ближняя плоскость отсечения
  1000 // Дальняя плоскость отсечения
);
camera.position.set(0, 3, 5);
camera.rotation.set(-0.6, 0, 0);

// Инициализация Telegram Web Apps
let tg = window.Telegram.WebApp;

// Установка приложения в полноэкранный режим
tg.expand();
tg.disableVerticalSwipes(); 

document.getElementsByClassName('tg-button')[0].addEventListener('click', () => {
  document.getElementById('garage-menu').classList.add('hide');
});

// Получение информации о пользователе и отображение приветствия
let username = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.username : 'guest';
document.getElementById('greeting').innerHTML = `привет, <span class="gradient-text"> ${username}</span>`;

// Настройка рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Улучшение качества
document.getElementById('garage-container').appendChild(renderer.domElement);

// Добавление света
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 5, 7.5);
scene.add(directionalLight);

// Загрузка моделей
loadGarage(scene);

// Загрузка модели автомобиля
loadCarModel(scene, function(car) {
  // После загрузки автомобиля можно выполнить дополнительные действия
});

// Настройка постобработки с эффектами Bloom, AO, SSR, AA и Grain
let composer, renderPass, ssaoPass, bloomPass, fxaaPass, filmPass;

// Параметры Bloom
const bloomParams = {
  exposure: 1,
  bloomStrength: 0.3,
  bloomThreshold: 0.2,
  bloomRadius: 0
};

// Параметры SSAO (Ambient Occlusion)
const ssaoParams = {
  radius: 16,
  samples: 32,
  rings: 4,
  distanceThreshold: 0.001,
  distanceFalloff: 0.5,
  luminanceInfluence: 0.5,
  color: 0x000000
};

// Инициализация постобработки
function initPostProcessing() {
  // Создание EffectComposer
  composer = new THREE.EffectComposer(renderer);
  
  // Добавление RenderPass
  renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  // Добавление SSAOPass (Ambient Occlusion)
   /* ssaoPass = new THREE.SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
  ssaoPass.kernelRadius = ssaoParams.radius;
  ssaoPass.minDistance = ssaoParams.distanceThreshold;
  ssaoPass.maxDistance = ssaoParams.distanceThreshold + ssaoParams.distanceFalloff;
  composer.addPass(ssaoPass);  */
  
  // Добавление UnrealBloomPass (Bloom)
  const bloomSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
  bloomPass = new THREE.UnrealBloomPass(bloomSize, bloomParams.bloomStrength, bloomParams.bloomRadius, bloomParams.bloomThreshold);
  composer.addPass(bloomPass);
  
  // Добавление FXAAShader (Anti-Aliasing)
  fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
  fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  fxaaPass.renderToScreen = false; // Не последняя пасса
  composer.addPass(fxaaPass);
  
  // Добавление FilmPass (Film Grain)
   /* filmPass = new THREE.FilmPass(0.35, 0.025, 648, false);
  filmPass.renderToScreen = true; // Последняя пасса
  composer.addPass(filmPass);  */
}

// Инициализация постобработки
initPostProcessing();

// Функция обновления размеров окна
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
  composer.setSize(width, height);
  
  // Обновление параметров пассов, требующих размеров
  if (ssaoPass) {
    ssaoPass.setSize(width, height);
  }
  
  if (fxaaPass) {
    fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
  }
}
window.addEventListener('resize', onWindowResize, false);

// Переменные для управления камерой
let isMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };

// Параметры вращения камеры
let rotationSpeed = 0.005;
let target = new THREE.Vector3(0, 0, 0); // Точка, вокруг которой вращается камера

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
  
  // Используем composer для рендеринга с эффектами постобработки
  composer.render();
}
animate();
