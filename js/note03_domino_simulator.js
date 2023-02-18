

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

        this._firstDomino = null;

        
        this._dominoStack = [];

		this._setupCamera();
        this._setupBackground();
		this._setupLight();
        this._setupAmmo();
		this._setupControls();
        this._setupDominoMaker();
        this._setupBackButton();

		window.onresize = this.resize.bind(this);
		this.resize();

		requestAnimationFrame(this.render.bind(this));
	}
    _setupBackground(){
        
    }
    _setupBackButton(){
        const backButton = document.querySelector("#back")
        backButton.addEventListener('click', evt => {
            if(this._dominoStack.length === 1){
                this._firstDomino = null;
            }
            
            const domino = this._dominoStack.pop()
            this._scene.remove(domino)
            console.log(this._physicsWorld)
            this._physicsWorld.removeRigidBody(domino.physicsBody)
        })
    }


    _setupDominoMaker(){
        const raycaster = new THREE.Raycaster();

        // click event
        window.addEventListener("click", event =>{
            if(!event.ctrlKey) return;
            const width = this._divContainer.clientWidth;
            const height = this._divContainer.clientHeight;
            const pt = {
                x: (event.clientX / width) * 2 - 1,
                y: - (event.clientY / height) * 2 + 1
            }
            raycaster.setFromCamera(pt, this._camera);
            const clickedPoint = raycaster.intersectObjects([this._plane])[0].point;
            this.makeDomino(clickedPoint)
        })
        
        
        // touch event
        this.touchStartPos = null;
        this.isMoved = false
        
        window.addEventListener("touchstart", evt =>{
            this.touchStartPos = [evt.touches[0].clientX, evt.touches[0].clientY];
        })
        window.addEventListener("touchmove", evt =>{
            this.isMoved = true;
        })
        window.addEventListener("touchend", evt =>{
            
            if(!this.isMoved){
                const width = this._divContainer.clientWidth;
                const height = this._divContainer.clientHeight;
                const pt = {
                    x: (this.touchStartPos[0] / width) * 2 - 1,
                    y: - (this.touchStartPos[1] / height) * 2 + 1
                }
                raycaster.setFromCamera(pt, this._camera);

                if(this._firstDomino){
                    const interObj = raycaster.intersectObjects([this._firstDomino,this._plane])
                    if(interObj[0]){
                        if (interObj[0].object === this._firstDomino){
                        
                            this.pull(interObj[0]);
                        }
                        else{
                            this.makeDomino(interObj[0].point);
                        }
                    }

                    
                }
                else{
                    const interObj = raycaster.intersectObjects([this._plane]);
                    if(interObj[0]){
                        this._firstDomino = this.makeDomino(interObj[0].point)
                    }
        
                    
                    
                }

            }

            this.isMoved = false;
            
            
        })
    }
    pull(object){
        

        const positionAttribute = object.object.geometry.getAttribute( 'position' );

        
        const vertex0_world = object.object.localToWorld((new THREE.Vector3()).fromBufferAttribute( positionAttribute, 0));
        const vertex1_world = object.object.localToWorld((new THREE.Vector3()).fromBufferAttribute( positionAttribute, 1))
        const vertex5_world = object.object.localToWorld((new THREE.Vector3()).fromBufferAttribute( positionAttribute, 5));
        
        if(object.faceIndex === 8 || object.faceIndex === 9){
            
            object.object.physicsBody.applyTorque(new Ammo.btVector3(-(vertex0_world.x - vertex5_world.x)*20,-(vertex0_world.y - vertex5_world.y)*20,-(vertex0_world.z - vertex5_world.z)*20))
            // object.object.physicsBody.applyForce(new Ammo.btVector3((vertex1_world.x - vertex0_world.x)*40,(vertex1_world.y - vertex0_world.y)*40,(vertex1_world.z - vertex0_world.z)*40))
            
        }
        if(object.faceIndex === 10 || object.faceIndex === 11){
            object.object.physicsBody.applyTorque(new Ammo.btVector3((vertex0_world.x - vertex5_world.x)*20,(vertex0_world.y - vertex5_world.y)*20,(vertex0_world.z - vertex5_world.z)*20))
            // object.object.physicsBody.applyForce(new Ammo.btVector3(-(vertex1_world.x - vertex0_world.x)*40,-(vertex1_world.y - vertex0_world.y)*40,-(vertex1_world.z - vertex0_world.z)*40))
        }
        
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

    makeDomino(pos){
        
        const scale = {x: 0.75, y: 1, z: 0.1};
        const dominoGeometry = new THREE.BoxGeometry();
        const dominoMaterial = new THREE.MeshPhysicalMaterial({color : this._firstDomino ? 0xb3e3ff : 0xffff00}); 
 
        
        const domino = new THREE.Mesh(dominoGeometry, dominoMaterial);
        if(!this._firstDomino) {
            this._firstDomino = domino
        }             
        this._dominoStack.push(domino)
        



        const mass = 1;
        
        domino.scale.set(scale.x, scale.y, scale.z);
        domino.position.set(pos.x, scale.y / 2, pos.z)
        domino.lookAt(this._camera.position.x, scale.y / 2, this._camera.position.z);
 
        
        domino.castShadow = true;
        domino.receiveShadow = true;
        this._scene.add(domino)

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(domino.rotation)

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
        this._physicsWorld.addRigidBody(body);

        domino.physicsBody = body;
        
        return domino
        
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
        this._physicsWorld.addRigidBody(body)

    }

    _createDomino(){
        const scale = {x: 0.75, y: 1, z: 0.1};
        const pos ={x: 0, y: scale.y / 2 + this._table.scale.y / 2, z: 0};
        
        const dominoGeometry = new THREE.BoxGeometry();
        const dominoMaterial = new THREE.MeshPhysicalMaterial();
        const domino = new THREE.Mesh(dominoGeometry, dominoMaterial);


        const mass = 1;
        
        domino.scale.set(scale.x, scale.y, scale.z);
        domino.position.set(pos.x, pos.y, pos.z);
        domino.lookAt(1,pos.y,0);

        
        domino.castShadow = true;
        domino.receiveShadow = true;
        this._scene.add(domino)

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(domino.rotation)

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
        this._physicsWorld.addRigidBody(body);

        domino.physicsBody = body;

    }

	_setupCamera() {
		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		camera.position.set(0,10,10)
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
		this._createTable()
        // this._createDomino()
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
            
            if( this._firstDomino && this._firstDomino.physicsBody.isActive()) this._firstDomino.physicsBody.activate();
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