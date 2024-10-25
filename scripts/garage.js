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
camera.rotation.set(-.6,0,0);




// Инициализация Telegram Web Apps
let tg = window.Telegram.WebApp;

// Установка приложения в полноэкранный режим
tg.expand();
tg.disableVerticalSwipes(); 
//tg.allow_vertical_swipe(false);

// Получение информации о пользователе и отображение приветствия
let username = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.username : 'guest';
document.getElementById('greeting').innerHTML = `привет, <span class ="gradient-text"> ${username}</span>`;

// Настройка рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('garage-container').appendChild(renderer.domElement);

// Добавление света
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, .5);
directionalLight.position.set(5, 5, 7.5);
scene.add(directionalLight);


loadGarage(scene);

// Загрузка модели автомобиля
loadCarModel(scene, function(car) {
  // После загрузки автомобиля можно выполнить дополнительные действия
});



// Переменные для управления камерой
let isMouseDown = false;
let previousMousePosition = {
  x: 0,
  y: 0
};

// Параметры вращения камеры
let rotationSpeed = 0.005;
let target = new THREE.Vector3(0, 0, 0); // Точка, вокруг которой вращается камера

// Обработчики событий мыши
renderer.domElement.addEventListener('mousedown', function(event) {
  isMouseDown = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
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

    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }
});

// Обработка сенсорных событий для touch-устройств
renderer.domElement.addEventListener('touchstart', function(event) {
  if (event.touches.length === 1) {
    isMouseDown = true;
    previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
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

    previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
});

renderer.domElement.addEventListener('touchend', function(event) {
  isMouseDown = false;
});

// Обработка изменения размера окна
window.addEventListener('resize', function() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Анимация
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
