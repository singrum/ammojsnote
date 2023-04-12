import * as TWEEN from "../node_modules/@tweenjs/tween.js/dist/tween.esm.js"
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
		this._clock = new THREE.Clock();
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.time = 0;
		this.step = 0.1;
		this.pointerDown = false;
		this.cutterTweenFin = true;
		this.candyPieces = []

		this._setupCamera();
		this._setupLight();
		this._setupAmmo();
		
		

		window.onresize = this.resize.bind(this);
		this.resize();
		this.temp = 0;
		requestAnimationFrame(this.render.bind(this));
	}
	_setupAmmo(){
        Ammo().then(() => {
            const overlappingPairCache = new Ammo.btDbvtBroadphase();
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const solver = new Ammo.btSequentialImpulseConstraintSolver();

            const physicsWorld = new Ammo.btDiscreteDynamicsWorld(
                dispatcher, overlappingPairCache, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -30, 0));

            this._physicsWorld = physicsWorld;
            this._setupModel();
			this._setupTable();
			this._setupControls();
			this._setupBackground();
			this._setupTween();
			this._setupEvent();
        })
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
		
		camera.position.set(20,20,20)
		camera.lookAt(0,0,0)
		// camera.zoom = 0.1
		this._camera = camera;
        this._scene.add(this._camera)
	}

	_setupTable(){

        const scale = {x:1000, y:0.5, z: 1000};
        const position = {x: 0, y: -scale.y / 2 - 10, z: 0};
        
        const tableGeometry = new THREE.BoxGeometry();
        const tableMaterial = new THREE.MeshLambertMaterial({ visible : false});
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        
        
        table.position.set(position.x, position.y, position.z);
        table.scale.set(scale.x, scale.y, scale.z);
        
        this._scene.add(table)
        this._table = table;

        const transform = new Ammo.btTransform();
        const quaternion = {x: 0, y: 0, z: 0, w: 1};
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
        transform.setRotation(
            new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btBoxShape(
            new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));

        const mass = 0;
        colShape.calculateLocalInertia(mass);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setRestitution(0.3)
        this._physicsWorld.addRigidBody(body)
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
		light.position.set(10, 20, 20);
		this._scene.add(light);
		// const light = new THREE.DirectionalLight(color, 1);

		const pointLight = new THREE.PointLight(color, 1);
		pointLight.position.set(0,10,0)
		this._scene.add(pointLight)
		

		
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
	_setupEvent(){
		const onPointerDown = ( event ) => {
			
			this.pointerDown = true;

			document.addEventListener( 'pointerup', onPointerUp );

		}
		const onPointerUp = (event) => {
			this.pointerDown = false;
			document.removeEventListener( 'pointerup', onPointerUp );
		}
		this._divContainer.addEventListener( 'pointerdown', onPointerDown );
	}
	_setupTween(){
		const maxOverhang = 10;
		const baseTween = new TWEEN.Tween(this.baseSet.position).to({x : maxOverhang}, 1000).start()

		const cutterTweenDown = new TWEEN.Tween(this.cutter.position)
		.to({y : 2}, 100)
		.onStart(()=>{
			this.cutterTweenFin = false;
		})
		.onComplete(()=>{
			baseTween.stop();
			this.setCandyPiece(this.baseSet.position.x)
			this.baseSet.position.x = 0;			
			
			
		});
		const cutterTweenUp = new TWEEN.Tween(this.cutter.position)
		.to({y : 4}, 100)
		.onComplete(()=>{

			baseTween.start();
			this.cutterTweenFin = true;
		})

		cutterTweenDown.chain(cutterTweenUp);

		this.cutterTweenDown = cutterTweenDown;
		this.baseTween = baseTween;
	

	}
	setCandyPiece(overhang){
		const candyPieces = [this.candyArr[0].clone(), this.candyArr[1].clone(), this.candyArr[2].clone()];
		candyPieces.forEach((e,i) => {
			e.position.set(overhang / 2, 0, (i - 1 ) * this.candyRadius * 2)
			e.scale.y = overhang;
			e.rotation.z = Math.PI/2
			this.setPhysics(e)
			this._scene.add(e)
			this.candyPieces.push(e)
			e.physicsBody.setLinearVelocity( new Ammo.btVector3( 10, 0, 0))
			e.physicsBody.setAngularVelocity(new Ammo.btVector3(this.randRange(-0.5,0.5),this.randRange(-0.5,0.5),this.randRange(-2,2)))
		})

		
	}
	setPhysics(candy){
        const pos = candy.position
        const scale = candy.scale;
        const mass = 1;
        
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(candy.rotation)

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btCylinderShape(new Ammo.btVector3(this.candyRadius, candy.scale.y * 0.5, this.candyRadius));

        const localInertia = new Ammo.btVector3(0,0,0);
        colShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setRestitution(0.4);
        body.setFriction(0.8);
        this._physicsWorld.addRigidBody(body);

        candy.physicsBody = body;
	}

	_setupModel() {
		const candyRadius = 0.8;
		this.candyRadius = candyRadius
        const outerLid = new THREE.Mesh( new THREE.RingGeometry( candyRadius * 0.9, candyRadius, 32 ), new THREE.MeshPhysicalMaterial( { color: 0xffff00} ) );
		outerLid.name = "outerLid"
        const innerLid = new THREE.Mesh( new THREE.CircleGeometry( candyRadius * 0.9, 32 ), new THREE.MeshPhysicalMaterial( { color: 0xffffff } ));
        const candyLid = new THREE.Object3D();
		
        candyLid.add(outerLid, innerLid)
        
        const candyCylinder = new THREE.Mesh(new THREE.CylinderGeometry(candyRadius, candyRadius, 1, 32,1, true), new THREE.MeshPhysicalMaterial({color : 0xffff00}));
		candyCylinder.name = "candyCylinder"
        const candy = new THREE.Object3D();
        const topLid = candyLid.clone();
		topLid.rotation.x = -Math.PI/2
        const bottomLid = candyLid.clone();
		bottomLid.rotation.x = Math.PI/2
        candy.add(candyCylinder, topLid, bottomLid);
        topLid.position.y = 0.5;
        bottomLid.position.y = -0.5;
		const candyArr =[candy.clone(),candy.clone(),candy.clone()] 
		this.candyArr =candyArr
		
		const roughness =0.2;
		const metalness = 0.4;
		const clearcoat = 1;
		const clearcoatRoughness = 0;
		const materialArr = [new THREE.MeshPhysicalMaterial( { color: 0xFB7AFC, roughness : roughness, metalness : metalness} ) ,
			new THREE.MeshPhysicalMaterial( { color: 0xD2E603, roughness : roughness, metalness : metalness} ),
			new THREE.MeshPhysicalMaterial( { color: 0xFF8E00, roughness : roughness, metalness :metalness} )]

		for(let i = 0;i<3;i++){
			candyArr[i].getObjectByName("outerLid").material = materialArr[i]
			candyArr[i].getObjectByName("candyCylinder").material = materialArr[i]
		}
		
        
		

		
		const baseLen = 100;
		const bases = [candyArr[0].clone(),candyArr[1].clone(),candyArr[2].clone()];
		bases.forEach(e=>{
			e.scale.y = baseLen;
		})
		const baseSet = new THREE.Object3D();
		baseSet.add(bases[0],bases[1], bases[2])
		
		baseSet.children[0].position.set(0,-baseLen/2, - candyRadius * 2)
		baseSet.children[1].position.set(0,-baseLen/2, 0)
		baseSet.children[2].position.set(0,-baseLen/2, candyRadius * 2)
		baseSet.rotation.z = -Math.PI/2
		
		this._scene.add(baseSet)
		this.baseSet = baseSet
        
		
		const cutterWidth = 10;
		const cutterHeight = 5;
		
		const cutter = new THREE.Mesh(new THREE.PlaneGeometry( cutterWidth, cutterHeight),new THREE.MeshPhysicalMaterial({color : 0x555555, roughness : roughness, metalness : metalness}));
		cutter.rotation.y = Math.PI/2
		cutter.position.y = 4
		this._scene.add(cutter)
		this.cutter = cutter
		




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
		this.updatePhysics();
		TWEEN.update();
		requestAnimationFrame(this.render.bind(this));
	}

	updatePhysics(){
		const deltaTime = this._clock.getDelta();
		if(!this._physicsWorld) return;
		this._physicsWorld.stepSimulation(deltaTime, 10);
		

		this.candyPieces.forEach(obj3d => {
				
			const objThree = obj3d;
			const objAmmo = objThree.physicsBody;
			const motionState = objAmmo.getMotionState();
			let tmpTrans = this._tmpTrans;
			if(tmpTrans === undefined) tmpTrans = this._tmpTrans = new Ammo.btTransform();
			motionState.getWorldTransform(tmpTrans);
			
			const pos = tmpTrans.getOrigin();
			const quat = tmpTrans.getRotation();

			objThree.position.set(pos.x(), pos.y(), pos.z());
			objThree.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
		})
	}
	update() {
		
		if(this.cutterTweenFin && this.pointerDown){
			this.cutterTweenDown.start()
		}

	}

}

window.onload = function () {
	new App();
};