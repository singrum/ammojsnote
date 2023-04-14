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
		this.physicsMesh = []

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
			this._setupBox();
			this._setupControls();
			this._setupBackground();
			this._setupTween();
			this._setupEvent();
        })
    }

    _setupBackground(){
        this._scene.background = new THREE.Color(0xDDFFBB);

    }
	_setupControls(){ 
		new OrbitControls(this._camera, this._divContainer);
	}
	

	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const aspectRatio = window.innerWidth / window.innerHeight;
		const camera = new THREE.OrthographicCamera( -aspectRatio * width / 2, aspectRatio * width / 2, width / 2, -width /2, 0.000001, 100000 );
		
		camera.position.set(30,30,30)
		camera.zoom = 7
		camera.lookAt(0,0,0)
		
		this._camera = camera;
        this._scene.add(this._camera)
	}



	_setupBox(){
		const w = 100;
		const h = 10;
		const d = 1;

		const plateMaterial = new THREE.MeshPhysicalMaterial( { color: 0xffff00, transparent : true, opacity : 0.2, visible : false} );
		const plate = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), plateMaterial);
		const floor = new THREE.Mesh(new THREE.BoxGeometry(w,w,d), plateMaterial);
		const transitionX = w/2
		const transitionY = -3
		const front = plate.clone();
		front.position.set(0 + transitionX, - h / 2 +transitionY, w / 2 + d / 2);
		const right = plate.clone();
		right.position.set(w / 2 + d / 2+ transitionX, - h / 2 +transitionY, 0);
		right.rotation.set(0,Math.PI / 2, 0);
		const back = plate.clone();
		back.position.set(0+ transitionX, - h / 2 +transitionY, - w / 2 - d / 2);
		back.rotation.set(0,Math.PI, 0);
		const left = plate.clone();
		
		left.material =  new THREE.MeshPhysicalMaterial({			color: 0xffffff,
			metalness: .1,
			roughness:0.05,
			ior: 1.4, // 1(진공) , 1.00029(공기), 1.4~1.7(유리), 2.419(다이아몬드)
			thickness: 0.2,
			transmission: 1,
			})
		left.position.set(-w / 2 - d / 2+ transitionX, - h / 2 +transitionY, 0 );
		left.rotation.set(0,-Math.PI / 2, 0);

		floor.position.set(0+ transitionX, -h - d / 2 +transitionY, 0);
		floor.rotation.set(Math.PI / 2,0, 0);
		floor.name = "floor"
		
		const box = new THREE.Object3D();
		box.add(front, right, back, left, floor);
		this._scene.add(box)
		box.children.forEach(plate=>{
			if(plate.name != "floor"){
				this.setPhysicsOnPlate(plate, w,h,d);
			}
			else {
				this.setPhysicsOnPlate(plate,w,w,d)
			}
			
		})

		const metalMaterial = new THREE.MeshPhysicalMaterial({color : 0xffffff, roughness : 0.2, metalness : 0.7, flatShading : false});
		const metalTransparent = new THREE.MeshPhysicalMaterial({color : 0xffffff, roughness : 1, metalness : 0, flatShading : false, transparent : true, opacity : 0.5});
		const boxWall = new THREE.Mesh(new THREE.PlaneGeometry( w, h),metalTransparent)
		const boxfloor = new THREE.Mesh(new THREE.PlaneGeometry( w, w),metalMaterial)
		const realbox = new THREE.Object3D()
		realbox.add(boxWall.clone(),boxWall.clone(),boxWall.clone(),boxWall.clone(), boxfloor.clone())		
		realbox.children[1].rotation.y = Math.PI/2;
		realbox.children[3].rotation.y = Math.PI/2;
		realbox.children[4].rotation.x = -Math.PI/2
		realbox.children[0].position.set(transitionX, -h/2 +transitionY, w/2)
		realbox.children[1].position.set(w/2 + transitionX, -h/2 +transitionY, 0)
		realbox.children[2].position.set(transitionX, -h/2 +transitionY, -w/2)
		realbox.children[3].position.set(- w/2 + transitionX, -h/2 +transitionY, 0)
		realbox.children[4].position.set(transitionX,-h+transitionY,0)
		realbox.children[4].receiveShadow = true;
		this._scene.add(realbox)
		
		
	}

	setPhysicsOnPlate(obj,w,h,d){
        const pos = obj.position
        const scale = {x : w, y : h, z : d};
        const mass = 0;
        
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(obj.rotation)

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));

        const localInertia = new Ammo.btVector3(0,0,0);
        colShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setRestitution(0.4);
        body.setFriction(0.8);
        this._physicsWorld.addRigidBody(body);
		this.physicsMesh.push(obj)
        obj.physicsBody = body;
	}

	_setupLight() {
		const color = 0xffffff;
		const intensity = 0.5;

		const defaultLight = new THREE.AmbientLight(0xffffff, 0.5);
		this._scene.add(defaultLight)

		const light = new THREE.DirectionalLight(color, 0.7);
		
		light.position.set(10, 20, 20);
		this._scene.add(light);
		// const light = new THREE.DirectionalLight(color, 1);
		const dlight2 = new THREE.DirectionalLight(color, 0.7);;
		dlight2.position.set(5, -20, 10);
		this._scene.add(dlight2);

		const pointLight = new THREE.PointLight(color, 1);
		pointLight.position.set(3,40,0)
		pointLight.castShadow = true;
		pointLight.shadow.camera.top = pointLight.shadow.camera.right = 1000;
		pointLight.shadow.camera.bottom = pointLight.shadow.camera.left = -1000;
		pointLight.shadow.mapSize.width = pointLight.shadow.mapSize.height = 512 // 텍스쳐 맵 픽셀 수 증가 -> 선명
		pointLight.shadow.radius = 3;
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
		const maxOverhang = 15;
		const baseTween = new TWEEN.Tween(this.baseSet.position).to({x : maxOverhang}, 1500).start()

		const cutterTweenDown = new TWEEN.Tween(this.cutter.position)
		.to({y : -1}, 100)
		.onStart(()=>{
			this.cutterTweenFin = false;
		})
		.onComplete(()=>{
			baseTween.stop();
			this.setCandyPiece(this.baseSet.position.x)
			this.baseSet.position.x = 0;			
			
			
		});
		const cutterTweenUp = new TWEEN.Tween(this.cutter.position)
		.to({y : 1}, 100)
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
			e.rotation.z = -Math.PI/2
			this.setPhysics(e)
			this._scene.add(e)
			this.physicsMesh.push(e)
			e.physicsBody.setLinearVelocity( new Ammo.btVector3( 15, this.randRange(0,5), 0))
			e.physicsBody.setAngularVelocity(new Ammo.btVector3(this.randRange(-1,1),this.randRange(-1,1),this.randRange(-2,2)))
			e.traverse( function ( object ) {

				if ( object.isMesh ) {
			
					object.castShadow = true;
					object.receiveShadow =true;
				}
			
			} );
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
		const candyRadius =1;
		this.candyRadius = candyRadius
        const outerLid = new THREE.Mesh( new THREE.RingGeometry( candyRadius * 0.8, candyRadius, 32 ), new THREE.MeshPhysicalMaterial( { color: 0xffff00} ) );
		outerLid.name = "outerLid"
		const textureLoader = new THREE.TextureLoader();
		const textures = [textureLoader.load('../src/smile.jpg'),textureLoader.load('../src/sad.jpg'), textureLoader.load('../src/surp.jpg') ]
		textures.forEach(texture=>{texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		texture.generateMipmaps = false;
		texture.center = new THREE.Vector2(0.5,0.5);
		texture.rotation = Math.PI/2
	})
		

		
		const innerLid = new THREE.Mesh( new THREE.CircleGeometry( candyRadius * 0.8, 32 ), new THREE.MeshPhysicalMaterial());
		innerLid.name = "innerLid"
		


        const candyLid = new THREE.Object3D();
		
        candyLid.add(outerLid, innerLid)
        
        const candyCylinder = new THREE.Mesh(new THREE.CylinderGeometry(candyRadius, candyRadius, 1, 32,1, true), new THREE.MeshPhysicalMaterial({color : 0xffff00}));
		candyCylinder.name = "candyCylinder"
        const candy = new THREE.Object3D();
        const topLid = candyLid.clone();
		topLid.rotation.x = -Math.PI/2
		topLid.name = "topLid"
        const bottomLid = candyLid.clone();
		bottomLid.rotation.x = Math.PI/2
		bottomLid.name = "bottomLid"
        candy.add(candyCylinder, topLid, bottomLid);
        topLid.position.y = 0.5;
        bottomLid.position.y = -0.5;
		const candyArr =[candy.clone(),candy.clone(),candy.clone()] 
		this.candyArr =candyArr
		
		const roughness =0.2;
		const metalness = 0.4;
		const materialArr = [
			new THREE.MeshPhysicalMaterial( { color: 0xFB7AFC, roughness : roughness, metalness : metalness} ) ,
			new THREE.MeshPhysicalMaterial( { color: 0xD2E603, roughness : roughness, metalness : metalness} ),
			new THREE.MeshPhysicalMaterial( { color: 0xFF8E00, roughness : roughness, metalness :metalness} )]

		for(let i = 0;i<3;i++){
			// let currTopLid = candyArr[i].getObjectByName("topLid");
			// currTopLid = topLid.clone();
			// currTopLid.material = materialArr[i]


			
			// let currBottomLid = candyArr[i].getObjectByName("bottomLid");
			// currBottomLid = bottomLid.clone();
			// currBottomLid.material = materialArr[i]
			candyArr[i].getObjectsByProperty("name", "outerLid").forEach(obj => obj.material =  materialArr[i])
			

			candyArr[i].getObjectsByProperty("name","innerLid").forEach(obj => {obj.material =  new THREE.MeshPhysicalMaterial({ map: textures[i] });})

			// innerLid.material = new THREE.MeshBasicMaterial({ map: textures[i] })
			// console.log(innerLid)
			
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
		baseSet.traverse( function ( object ) {

			if ( object.isMesh ) {
		
				object.castShadow = true;
		
			}
		
		} );
        
		
		const cutterWidth = 10;
		const cutterHeight = 5;
		const metalMaterial = new THREE.MeshPhysicalMaterial({color : 0xffffff, roughness : 0.2, metalness : 0.7, flatShading : false});
		const cutter = new THREE.Object3D();
		cutter.add(new THREE.Mesh(new THREE.PlaneGeometry( cutterWidth, cutterHeight),new THREE.MeshPhysicalMaterial({color : 0xdddddd, roughness : 0.2, metalness : 0, flatShading : false})), new THREE.Mesh(new THREE.CylinderGeometry(1,1,4, 32), new THREE.MeshPhysicalMaterial({color : 0x222222, roughness : 1})))
		cutter.children[0].position.y = cutterHeight / 2
		cutter.children[1].position.set(-4/2 + -cutterWidth / 2 ,cutterHeight - 1.4,0)
		cutter.children[1].rotation.z = Math.PI/2
		cutter.children[1].scale.x = 1.4
		
		cutter.rotation.y = Math.PI/2
		cutter.position.y =1
		this._scene.add(cutter)
		this.cutter = cutter
		
		//conveyer
		const conveyerWidth = 30;
		const conveyerHeight = 2;
		const conveyerDepth = 20
		const shape = new THREE.Shape();
		shape.arc(conveyerWidth / 2,0, conveyerHeight / 2, Math.PI/2, 3 * Math.PI/2, true);
		shape.arc(-2*conveyerWidth / 2,conveyerHeight / 2, conveyerHeight / 2, -Math.PI/2, -3 * Math.PI/2, true);
		const extrudeSettings = {
			bevelSize : 0,
			bevelThickness : 0,
			depth: conveyerDepth,
		};
		
		const conveyer = new THREE.Mesh( new THREE.ExtrudeGeometry( shape, extrudeSettings ), metalMaterial)
		conveyer.position.set(-conveyerWidth / 2,-2,- conveyerDepth /2)
		conveyer.receiveShadow = true;
		this._scene.add(conveyer);



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
		

		this.physicsMesh.forEach(obj3d => {
				
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
