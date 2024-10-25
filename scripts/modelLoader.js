// modelLoader.js

function loadCarModel(scene, onLoaded) {
    const loader = new THREE.FBXLoader();
    const textureLoader = new THREE.TextureLoader();
  
    // Загружаем текстуры
    const envMap = textureLoader.load('assets/env/bgcolor.png');
    envMap.mapping = THREE.EquirectangularReflectionMapping;
envMap.encoding = THREE.sRGBEncoding; // Учитываем цветовое пространство

// Настройка центра вращения и отключение flipY для корректного вращения
envMap.center.set(.5, .5);
envMap.rotation = 100;
envMap.flipY = false;
envMap.flipX = false;


    const carBodyTexture = textureLoader.load('assets/cars/bmw_body_texture.jpg');
    carBodyTexture.wrapS = THREE.RepeatWrapping;
    carBodyTexture.wrapT = THREE.RepeatWrapping;
    carBodyTexture.repeat.set( 1, 1 );
/*     const wheelTexture = textureLoader.load('textures/wheel_texture.jpg'); */
  
    // Создаем материалы с текстурами
    let carGlassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 0.0,
        roughness: 0.0,
        envMap: envMap,
        reflectivity: 0.8,
        envMapIntensity: 1.00,});
    

    let carBodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: .0,
        roughness: 0.1,
        side:2,
        map: carBodyTexture,
        envMap: envMap,
        //normalMap: faceNormalMap, // Добавлена карта нормалей
        //normalScale: new THREE.Vector2(.8, .8), // Корректная настройка масштаба нормалей
        //roughnessMap: faceMap,
        envMapIntensity: 1.50,
        clearcoat: 0.1,
        clearcoatRoughness: 0.9,
        reflectivity: 0.8,
        // Добавляем эффект френеля через модификацию шейдера
        onBeforeCompile: (shader) => {
            shader.uniforms.fresnelColor = {
                value: new THREE.Color(0xaa88ee),
            }; // Фиолетовый цвет
    
            // Объявляем 'uniform vec3 fresnelColor;' в начале фрагментного шейдера
            shader.fragmentShader =
                'uniform vec3 fresnelColor;\n' + shader.fragmentShader;
    
            // Модифицируем фрагментный шейдер
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                `
                #include <output_fragment>
                vec3 normalDirection = normalize(vNormal);
                vec3 viewDirection = normalize(vViewPosition);
                float fresnel = abs(dot(normalDirection, viewDirection));
                fresnel = pow(1.0 - fresnel, 4.0);
                //float u = 0.5 - pow(1.0 - fresnel, 10.5);
                //gl_FragColor.rgb -= fresnel * fresnelColor + u*.1;
                //gl_FragColor.rgb -= pow(fresnel,30.0) * fresnelColor * 1.0;
                gl_FragColor.rgb += pow(fresnel,2.0) * fresnelColor * 2.0;
                `
            );
        },
    });
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, 
        side:2,
        metalness: .0,
        roughness: 0.1, /* map: wheelTexture  */});
  
    // Загружаем кузов автомобиля
    loader.load('assets/cars/bmw_body.fbx', function (body) {
      // Масштабируем и позиционируем кузов, если необходимо
      body.scale.set(0.01, 0.01, 0.01);
      body.position.set(0, 0, 0);
  
      // Применяем материал к кузову
      body.traverse(function (child) {
        if (child.isMesh) {
          child.material = carBodyMaterial;
        }
      });
  
      // Создаем pivots для колес
      const frontWheelPivot = new THREE.Object3D();
      const backWheelPivot = new THREE.Object3D();
  
      // Позиционируем pivots
      frontWheelPivot.position.set(0, 0, 0); // Примерное положение передних колес
      backWheelPivot.position.set(0, 0, -275);   // Примерное положение задних колес
  
      body.add(frontWheelPivot);
      body.add(backWheelPivot);
  
      loader.load('assets/cars/bmw_glass.fbx', function (glass) {
        glass.scale.set(1, 1, 1);
  
        // Применяем материал к колесу
        glass.traverse(function (child) {
          if (child.isMesh) {
            child.material = carGlassMaterial;
          }
        });
  
        body.add(glass);



      });
      // Загружаем колесо
      loader.load('assets/cars/bmw_wheel.fbx', function (wheel) {
        wheel.scale.set(1, 1, 1);
  
        // Применяем материал к колесу
        wheel.traverse(function (child) {
          if (child.isMesh) {
            child.material = wheelMaterial;
          }
        });
  
        // Клонируем колесо для передних колес
        const frontLeftWheel = wheel.clone();
        frontLeftWheel.position.set(0, 0, 0); // Левое переднее колесо
        frontLeftWheel.scale.set(-1,1,1);
        const frontRightWheel = wheel.clone();
        frontRightWheel.position.set(0, 0, 0); // Правое переднее колесо
  
        frontWheelPivot.add(frontLeftWheel);
        frontWheelPivot.add(frontRightWheel);
  
        // Клонируем колесо для задних колес
        const backLeftWheel = wheel.clone();
        backLeftWheel.position.set(0, 0, 0); // Левое заднее колесо
        backLeftWheel.scale.set(-1,1,1);
        const backRightWheel = wheel.clone();
        backRightWheel.position.set(0, 0, 0); // Правое заднее колесо
  
        backWheelPivot.add(backLeftWheel);
        backWheelPivot.add(backRightWheel);
  
        // Добавляем автомобиль в сцену
        scene.add(body);
  
        // Вызываем коллбэк после загрузки
        if (onLoaded) onLoaded(body);
      });
    });
  }
  