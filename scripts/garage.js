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

document.getElementsByClassName('tg-button')[0].addEventListener('click', () => {
  document.getElementById('garage-menu').classList.add('hide');
  document.getElementById('action-menu').style.display = '';
});

document.getElementsByClassName('action-button')[0].addEventListener('click', () => {
  document.getElementsByClassName('action-button')[0].style.display = 'none';

  gsap.to(camera.position, {x: -1, y : 0.3, z: 4, duration: .5});
  gsap.to(front.scale, { x: 1, z: 1, duration: .5, delay: .5 });
  
  gsap.to(camera.position, {x: -1, y : 0.2, z: -3, duration: .8, delay: 1});
  gsap.to(back.scale, { x: 1, z: 1, duration: .5, delay: 1.5 });

  gsap.to(camera.position, {x: 2.5, y : 1, z: 4, duration: 1, delay: 2});
  gsap.to(carDefaultPaintMaterial, {metalness: 0.0, duration: .5, delay: 2.5});
  //front.scale.set(1, 1, 1);
});

let target = new THREE.Vector3(0, 0, 0); // Точка, вокруг которой вращается камера
camera.lookAt(target);
document.getElementsByClassName('action-button')[1].addEventListener('click', () => {
  gsap.to(garage.scale, { x: 0, y: 0, duration: .1 });
  document.getElementsByClassName('action-button')[0].style.display = 'none';
  document.getElementsByClassName('action-button')[1].style.display = 'none';
  gsap.to(camera.position, {x: -2, y : 3, z: -5, duration: 1.5});
  loadRace(scene);
  //front.scale.set(1, 1, 1);
});



// Получение информации о пользователе и отображение приветствия
let username = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.username : 'guest';
document.getElementById('greeting').innerHTML = `привет, <span class="gradient-text"> ${username}</span>`;

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
loadCarModel(scene, function(car) {
  canRenderBody = true;
  // После загрузки автомобиля можно выполнить дополнительные действия
});





// Инициализация постобработки
//initPostProcessing();

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
