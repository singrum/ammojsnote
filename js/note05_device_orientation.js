
import * as THREE from '../node_modules/three/build/three.module.js';
import {OrbitControls} from '../node_modules/three/examples/jsm/controls/OrbitControls.js';


class App {
	constructor() {
		const divContainer = document.querySelector("#webgl_container");
		this._divContainer = divContainer;

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		
		divContainer.appendChild(renderer.domElement);

        renderer.shadowMap.enabled = true;
		this._renderer = renderer;
		renderer.setSize(window.innerWidth, window.innerHeight);
		const scene = new THREE.Scene();
		this._scene = scene;

        this._clock = new THREE.Clock();

		this._setupCamera();
		this._setupLight();
        this._setupAmmo();
        this._setupOrientationControls();

		window.onresize = this.resize.bind(this);
		this.resize();

		requestAnimationFrame(this.render.bind(this));
        
	}

    _setupOrientationControls(){
        window.addEventListener('deviceorientation', evt=>{
            
            if( ! (evt.alpha && evt.beta && evt.gamma)){
                return;
            }
            const alpha = THREE.MathUtils.degToRad(evt.alpha);
            const beta = THREE.MathUtils.degToRad(evt.beta);
            const gamma = THREE.MathUtils.degToRad(evt.gamma);
            
            document.querySelector("#debug").innerText = `alpha : ${alpha}, beta : ${beta}, gamma : ${gamma}`
            this._physicsWorld.setGravity(new Ammo.btVector3(
                Math.cos(beta) * Math.sin(gamma) * 9,
                -Math.sin(beta) * 9,
                -Math.cos(alpha) * Math.cos(gamma)) * 9); 
        }, false);
    }
    _setupAmmo(){
        Ammo().then(() => {
            const overlappingPairCache = new Ammo.btDbvtBroadphase();
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const solver = new Ammo.btSequentialImpulseConstraintSolver();

            const physicsWorld = new Ammo.btDiscreteDynamicsWorld(
                dispatcher, overlappingPairCache, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0,0,-9));

            this._physicsWorld = physicsWorld;
            this._setupModel();
        })
    }

	_setupControls(){
		new OrbitControls(this._camera, this._divContainer);
	}

    _createWall(){
        const X = 4;
        const Y = 10;
        const Z = 4;
        const depth = 0.5;

        const positionArr = [
            {x:0, y:0, z:-Z-depth/2},
            {x:0, y:0, z: depth/2},
            {x:0, y:Y/2+depth/2, z:-Z/2},
            {x:0, y:-Y/2-depth/2, z:-Z/2},
            {x:X/2+depth/2, y:0, z:-Z/2},
            {x:-X/2-depth/2, y:0, z:-Z/2}];
        const scaleArr = [
            {x:X, y:Y, z:depth},
            {x:X, y:Y, z:depth},
            {x:X, y:depth, z:Z},
            {x:X, y:depth, z:Z},
            {x:depth, y:Y, z:Z},
            {x:depth, y:Y, z:Z},];
        const wallArr = []
        for(let i = 0;i<6;i++){
            const Geometry = new THREE.BoxGeometry();
            const Material = new THREE.MeshPhongMaterial({color: 0x878787});
            const Wall = new THREE.Mesh(Geometry, Material);
    
            Wall.position.set(positionArr[i].x, positionArr[i].y, positionArr[i].z);
            Wall.scale.set(scaleArr[i].x, scaleArr[i].y, scaleArr[i].z);
            Wall.receiveShadow = true;
            if(i !== 1){
                this._scene.add(Wall)    
            }

            wallArr.push(Wall);
            
            const transform = new Ammo.btTransform();
            const quaternion = {x: 0, y: 0, z: 0, w: 1};
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(positionArr[i].x, positionArr[i].y, positionArr[i].z));
            transform.setRotation(
                new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
            const motionState = new Ammo.btDefaultMotionState(transform);
            const colShape = new Ammo.btBoxShape(
                new Ammo.btVector3(scaleArr[i].x * 0.5, scaleArr[i].y * 0.5, scaleArr[i].z * 0.5));

            const mass = 0;
            colShape.calculateLocalInertia(mass);
            const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape);
            const body = new Ammo.btRigidBody(rbInfo);
            body.setFriction(0.1)
            body.setRestitution(0.6)
            this._physicsWorld.addRigidBody(body)
        }
        

    }
    _createObj(){
        for(let i = 0; i<10; i++){
            const pos = {x: 0, y: 0, z: -2};
            const radius = 0.25;
            const quat = {x: 0, y: 0, z: 0, w:1};
            const mass = 1;
    
            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(radius),
                new THREE.MeshStandardMaterial({color: 0xff0000, metalness: 0.7, roughness: 0.4})
            )
            ball.position.set(pos.x, pos.y, pos.z);
            ball.castShadow = true;
            ball.receiveShadow = true;
            this._scene.add(ball);
    
            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
            transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
            const motionState = new Ammo.btDefaultMotionState( transform );
            const colShape = new Ammo.btSphereShape( radius );
            colShape.calculateLocalInertia( mass);
    
            const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape);
            const body = new Ammo.btRigidBody( rbInfo );
    
            this._physicsWorld.addRigidBody( body );
            
            ball.physicsBody = body;  
            body.setFriction(0.1)
            body.setRestitution(0.6)
            
        }
    }


	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
		camera.position.set(0,0,5)
        camera.lookAt(0,0,0)
		this._camera = camera;
	}

	_setupLight() {
        const ambientLight = new THREE.AmbientLight(0xffffff,0.3);
        this._scene.add(ambientLight);

		const color = 0xffffff;
		const intensity = 0.9;
		const light = new THREE.DirectionalLight(color, intensity);
		light.position.set(10, 3, 3);
		this._scene.add(light);

        light.castShadow = true;
        light.shadow.mapSize.width = light.shadow.mapSize.height = 2048;
        light.shadow.camera.left = light.shadow.camera.bottom = -15;
        light.shadow.camera.right = light.shadow.camera.top = 15;
	}

	_setupModel() {
		this._createWall()
        this._createObj()
	}

	resize() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;

		this._camera.aspect = width / height;
		this._camera.updateProjectionMatrix();

		this._renderer.setSize(width, height);
	}

	render(time) {
		this._renderer.render(this._scene, this._camera);
		this.update(time);
		requestAnimationFrame(this.render.bind(this));
	}

	update(time) {
		time *= 0.001;
		
        const deltaTime = this._clock.getDelta();

        if(this._physicsWorld){
            this._physicsWorld.stepSimulation(deltaTime);
            this._scene.traverse(obj3d => {
                if(obj3d instanceof THREE.Mesh){
                    const objThree = obj3d;
                    const objAmmo = objThree.physicsBody;
                    if(objAmmo){
                        const motionState = objAmmo.getMotionState();
                        if(motionState){
                            let tmpTrans = this._tmpTrans;
                            if(tmpTrans === undefined) tmpTrans = this._tmpTrans = new Ammo.btTransform();
                            motionState.getWorldTransform(tmpTrans);
                            
                            const pos = tmpTrans.getOrigin();
                            const quat = tmpTrans.getRotation();

                            objThree.position.set(pos.x(), pos.y(), pos.z());
                            objThree.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
                        }
                    }
                }
            })
        }
	}
}

window.onload = function () {
	new App();
};