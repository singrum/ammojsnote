

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
        this.brickScale = {x: 3, y: 0.7, z: 1};
		this._setupCamera();
		this._setupLight();
        this._setupAmmo();
		this._setupControls();
        this._setupShot();

		window.onresize = this.resize.bind(this);
		this.resize();

		requestAnimationFrame(this.render.bind(this));
	}
    _setupShot(){
        const raycaster = new THREE.Raycaster();
        window.addEventListener("click", event =>{
            if(!event.ctrlKey) return;
            const width = this._divContainer.clientWidth;
            const height = this._divContainer.clientHeight;
            const pt = {
                x: (event.clientX / width) * 2 - 1,
                y: - (event.clientY / height) * 2 + 1
            }
            raycaster.setFromCamera(pt, this._camera);
            const tmpPos = new THREE.Vector3();
            tmpPos.copy(raycaster.ray.origin);

            const pos = {x: tmpPos.x, y: tmpPos.y, z: tmpPos.z};
            const radius = 0.25;
            const quat = {x: 0, y: 0, z: 0, w:1};
            const mass = 1;

            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(radius),
                new THREE.MeshStandardMaterial({color: 0xff0000, metalness: 0.7, roughness: 0.4})
            )
            ball.position.set(pos.x, pos.y, pos.z);
            this._scene.add(ball);
            console.log(ball)

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

            tmpPos.copy(raycaster.ray.direction);
            tmpPos.multiplyScalar(20);

            body.setLinearVelocity( new Ammo.btVector3( tmpPos.x, tmpPos.y, tmpPos.z ) );
            body.setRestitution(0.5)
            ball.physicsBody = body;        
        })
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


    _createbox(){

        const pos = {x: 5, y: 5,z: 5};
        const scale = {x : 1, y : 2, z: 3};
        const boxGeometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
        const boxMaterial = new THREE.MeshPhysicalMaterial({color : 0xb3e3ff}); 
        
        
        const box = new THREE.Mesh(boxGeometry, boxMaterial);

        



        const mass = 1;
        
        
        box.position.set(pos.x, pos.y, pos.z)
        

        
        box.castShadow = true;
        box.receiveShadow = true;
        this._scene.add(box)

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(box.rotation)

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
        body.setRestitution(0.5);
        this._physicsWorld.addRigidBody(body);

        box.physicsBody = body;
    }








    _createOctahedron(){
        const geom =new THREE.OctahedronGeometry(1,0)
        const mate = new THREE.MeshPhysicalMaterial({color : 0xaa6666, flatShading : true});
        const mesh = new THREE.Mesh(geom, mate);
        const pos = {x: 0, y: 1, z: 0}
        this._scene.add(mesh)
        mesh.position.set(pos.x, pos.y, pos.z)
        mesh.rotateX(0.1)
        console.log(mesh)
        mesh.castShadow = true;
        

        const mass = 1;

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(mesh.rotation)

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btConvexHullShape();
        
        for(let i = 0; i<mesh.geometry.attributes.position.count; i++){
            
            let point = new Ammo.btVector3(mesh.geometry.attributes.position.array[3 * i],mesh.geometry.attributes.position.array[3 * i + 1], mesh.geometry.attributes.position.array[3 * i + 2])
            colShape.addPoint(point);
        }

        const localInertia = new Ammo.btVector3(0,0,0);
        colShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setRestitution(0.5);
        this._physicsWorld.addRigidBody(body);

        mesh.physicsBody = body;
    }










    _createZenga(){
        const getPosArrByFloor = (floor) => {
            if(floor % 2 === 0){
                return [{x : 0, y : this.brickScale.y / 2 + this.brickScale.y * floor, z : 0},
                {x : 0, y : this.brickScale.y / 2 + this.brickScale.y * floor, z : -this.brickScale.z},
                {x : 0, y : this.brickScale.y / 2 + this.brickScale.y * floor, z : this.brickScale.z},
                ] 
            }
            else{
                return [{x : 0, y : this.brickScale.y / 2 + this.brickScale.y * floor, z : 0},
                {x : -this.brickScale.z, y : this.brickScale.y / 2 + this.brickScale.y * floor, z : 0},
                {x : this.brickScale.z, y : this.brickScale.y / 2 + this.brickScale.y * floor, z : 0},
                ]
            }

        }


        let flag = false;

        for(let i = 0; i<10; i++){
            for(let pos of getPosArrByFloor(i)){
                this._createBrick(pos, flag)
            }
            flag = !flag
        }
        
        
           
    }

    _createBrick(pos, rotate90 = false){
        
        const brickGeometry = new THREE.BoxGeometry();
        const brickMaterial = new THREE.MeshPhysicalMaterial({color : 0xb3e3ff}); 
        
        
        const brick = new THREE.Mesh(brickGeometry, brickMaterial);

        



        const mass = 1;
        
        brick.scale.set(this.brickScale.x, this.brickScale.y, this.brickScale.z);
        brick.position.set(pos.x, pos.y, pos.z)
        if(rotate90){
            brick.rotateY(Math.PI / 2);
        }
        
        

        
        brick.castShadow = true;
        brick.receiveShadow = true;
        this._scene.add(brick)

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(brick.rotation)

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const colShape = new Ammo.btBoxShape(new Ammo.btVector3(this.brickScale.x * 0.5, this.brickScale.y * 0.5, this.brickScale.z * 0.5));

        const localInertia = new Ammo.btVector3(0,0,0);
        colShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        this._physicsWorld.addRigidBody(body);
        body.setRestitution(0.5)

        brick.physicsBody = body;
        
        return brick
    }

    _setupAmmo(){
        Ammo().then(() => {
            const overlappingPairCache = new Ammo.btDbvtBroadphase();
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const solver = new Ammo.btSequentialImpulseConstraintSolver();

            const physicsWorld = new Ammo.btDiscreteDynamicsWorld(
                dispatcher, overlappingPairCache, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -9.807, 0));

            this._physicsWorld = physicsWorld;
            this._setupModel();
        })
    }

	_setupControls(){
		new OrbitControls(this._camera, this._divContainer);
	}

    _createTable(){
        
        const scale = {x:30, y:0.5, z: 30};
        const position = {x: 0, y: -scale.y / 2, z: 0};

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(scale.x, scale.z), new THREE.MeshBasicMaterial({visible: false}));
        plane.position.set(position.x, position.y + scale.y / 2, position.z)
        plane.rotation.x = THREE.MathUtils.degToRad(-90);
        this._scene.add(plane)
        this._plane = plane
        

        const tableGeometry = new THREE.BoxGeometry();
        const tableMaterial = new THREE.MeshPhongMaterial({color: 0x878787});
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        
        
        table.position.set(position.x, position.y, position.z);
        table.scale.set(scale.x, scale.y, scale.z);
        table.receiveShadow = true;
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
        body.setRestitution(0.5)
        this._physicsWorld.addRigidBody(body)

    }


	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		camera.position.set(0,10,10)
        camera.lookAt(0,0,0)
		this._camera = camera;
	}

	_setupLight() {
        const ambientLight = new THREE.AmbientLight(0xffffff,0.3);
        this._scene.add(ambientLight);

		const color = 0xffffff;
		const intensity = 0.9;
		const light = new THREE.DirectionalLight(color, intensity);
		light.position.set(-10, 15, 10);
		this._scene.add(light);

        light.castShadow = true;
        light.shadow.mapSize.width = light.shadow.mapSize.height = 2048;
        light.shadow.camera.left = light.shadow.camera.bottom = -15;
        light.shadow.camera.right = light.shadow.camera.top = 15;
	}

	_setupModel() {
		this._createTable();
        // this._createZenga();
        this._createbox();
        this._createOctahedron();
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
            this._physicsWorld.stepSimulation(deltaTime, 10);
            
            

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