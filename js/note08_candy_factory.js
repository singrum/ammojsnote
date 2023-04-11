import * as THREE from '../node_modules/three/build/three.module.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
// https://sketchfab.com


class App {
	constructor() {
		const divContainer = document.querySelector("#webgl_container");
		this._divContainer = divContainer;

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		
		divContainer.appendChild(renderer.domElement);
		this._renderer = renderer;
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio( window.devicePixelRatio );
		const scene = new THREE.Scene();
		this._scene = scene;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.time = 0;
		this.step = 0.1;

		this._setupCamera();
		this._setupLight();
		this._setupModel();
		this._setupControls();
		this._setupBackground();

		window.onresize = this.resize.bind(this);
		this.resize();
		this.temp = 0;
		requestAnimationFrame(this.render.bind(this));
	}
    _setupBackground(){
        this._scene.background = new THREE.Color(0xD6CDA4);

    }
	_setupControls(){ 
		new OrbitControls(this._camera, this._divContainer);




	}

	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const aspectRatio = window.innerWidth / window.innerHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		
		camera.position.set(0,0,20)
		camera.lookAt(0,0,0)
		// camera.zoom = 0.1
		this._camera = camera;
        this._scene.add(this._camera)
	}

	_setupLight() {
		const color = 0xffffff;
		const intensity = 0.5;

		const defaultLight = new THREE.AmbientLight(0xffffff, 0.5);
		this._scene.add(defaultLight)

		const light = new THREE.DirectionalLight(color, 0.7);
		
		light.castShadow = true;
		light.shadow.camera.top = light.shadow.camera.right = 1000;
		light.shadow.camera.bottom = light.shadow.camera.left = -1000;
		light.shadow.mapSize.width = light.shadow.mapSize.height = 2048 // 텍스쳐 맵 픽셀 수 증가 -> 선명
		light.shadow.radius = 1;
		light.position.set(10, 10, 10);
		
		
		this._camera.add(light);
		
	}
	debugPoint(pos){
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute([pos.x, pos.y, pos.z], 3)
		);

		const material = new THREE.PointsMaterial({
			color:0xff38a2,
			size: 5,
			sizeAttenuation : false
		})
		const points = new THREE.Points(geometry, material);
		this._scene.add(points)
	}
	_setupModel() {
        const outerLid = new THREE.Mesh( new THREE.RingGeometry( 0.9, 1, 32 ), new THREE.MeshPhysicalMaterial( { color: 0xffff00} ) );
        const innerLid = new THREE.Mesh( new THREE.CircleGeometry( 0.9, 32 ), new THREE.MeshPhysicalMaterial( { color: 0xffffff } ));
        const candyLid = new THREE.Object3D();
        candyLid.add(outerLid, innerLid)
        
        const candyCylinder = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), new THREE.MeshPhysicalMaterial({color : 0xffff00}));
        const candy = new THREE.Object3D();
        const topLid = candyLid.clone();
        const bottomLid = candyLid.clone();
        candy.add(candyCylinder, topLid, bottomLid);
        topLid.position.y = 0.5;
        bottomLid.position.y = -0.5;
        

        


	}

	randRange(a,b){
		return Math.random() * (b - a) + a;
	}
	resize() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;

		this._camera.aspect = width / height;
		this._camera.updateProjectionMatrix();

		this._renderer.setSize(width, height);
	}

	render() {
		this._renderer.render(this._scene, this._camera);
		this.update();
		requestAnimationFrame(this.render.bind(this));
	}

	update() {
		this.time += this.step;
	}
	getRandomNum(num){
		
	}

}

window.onload = function () {
	new App();
};