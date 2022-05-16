const HexMaze=require('./hexmaze.js');
import { createWall } from './wall.js';
import * as THREE from 'three';

const clientWidth = 800;
const clientHeight = 450;

//DOM 元素
const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(clientWidth, clientHeight);
document.body.appendChild(renderer.domElement);

//場景
const scene = new THREE.Scene();

//人物(自帶光源)
const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 500);
const pointLight = new THREE.PointLight(0x909090, 1, 15);
scene.add(pointLight);
let person = {
    x: null,
    y: null,
    z: 1.7,
    ang: null,
    move: 0,
    rot: 0
}
function setPeople(cx, cy, cz, lx, ly, lz) {
    let [vx, vy, vz] = [lx - cx, ly - cy, lz - cz];
    let ux = -vx * vz;
    let uy = -vy * vz;
    let uz = vx * vx + vy * vy;
    let t = Math.sqrt(ux * ux + uy * uy + uz * uz);
    pointLight.position.set(cx, cy, cz);
    camera.position.set(cx, cy, cz);
    camera.up.set(ux / t, uy / t, uz / t);
    camera.lookAt(lx, ly, lz);
}

//環境光源
let ambientLight = new THREE.AmbientLight('#1c1c1c')
scene.add(ambientLight);

//坐標軸
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

//迷宮
const scale = 4 / 1000;
const mazeSize = 10;
const maze = new HexMaze(mazeSize, mazeSize, true, Math.round(mazeSize * 2 / 3));
let pathInfo;
let wallGroup = null;
let mazeCenter = {};
function reBuildMaze() {
    maze.RandomMaze(6);
    pathInfo = maze.getPaths();
    if (wallGroup) {
        scene.remove(wallGroup);
    }
    wallGroup = new THREE.Group();
    pathInfo.maze.forEach(p => {
        let lastX, lastY, n = p.length;
        let vMask = HexMaze.prototype.VALUE_MASK;
        let mMask = HexMaze.prototype.MOVE_MASK;
        for (let i = 0; i < n; ++i) {
            let t = p.x[i];
            let y = p.y[i];
            let x = (t & vMask);
            if (t & mMask) {
                lastX = x;
                lastY = y;
            } else {
                wallGroup.add(createWall(lastX, lastY, x, y));
                lastX = x;
                lastY = y;
            }
        }
    });
    mazeCenter.x = (pathInfo.xMin + pathInfo.xMax) / 2 * scale;
    mazeCenter.y = (pathInfo.yMin + pathInfo.yMax) / 2 * scale;
    scene.add(wallGroup);
}

reBuildMaze();

//動畫
function animate() {
    //更新角度
    person.ang = (person.ang + person.rot * 10) % 3600;
    let ang = person.ang / 1800 * Math.PI;
    let dx = Math.cos(ang) * 0.05 * person.move;
    let dy = Math.sin(ang) * 0.05 * person.move;
    let x = person.x + dx;
    let y = person.y + dy;
     if(maze.enableStand(x/scale, y/scale)) {
        person.x = x;
        person.y = y;
    }

    requestAnimationFrame(animate);
    setPeople(
        person.x,
        person.y,
        person.z,
        person.x + Math.cos(ang),
        person.y + Math.sin(ang),
        person.z
    );
    renderer.render(scene, camera);
};

person.ang = 0;
let [px, py] = maze.getXY(maze.start);
person.x = px * scale;
person.y = py * scale;
animate();

[px, py] = maze.getXY(maze.final);
px = px * scale;
py = py * scale;
const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3( px, py, 0 ),
        new THREE.Vector3( px, py, 10 )
    ]),
    new THREE.LineBasicMaterial({
	    color: 0xffffff
    })
);
scene.add( line );

document.addEventListener('keydown', (evt)=>{
    switch(evt.key) {
        case 'ArrowUp':
            person.move = 1;
            evt.preventDefault();
            break;
        case 'ArrowDown':
            person.move = -1;
            evt.preventDefault();
            break;
        case 'ArrowLeft':
            person.rot = 1;
            evt.preventDefault();
            break;
        case 'ArrowRight':
            person.rot = -1;
            evt.preventDefault();
            break;
    }
});
document.addEventListener('keyup', (evt)=>{
    switch(evt.key) {
        case 'ArrowUp':
            if(person.move === 1) {
                person.move = 0;
            }
            evt.preventDefault();
            break;
        case 'ArrowDown':
            if(person.move === -1) {
                person.move = 0;
            }
            evt.preventDefault();
            break;
        case 'ArrowLeft':
            if(person.rot === 1) {
                person.rot = 0;
            }
            evt.preventDefault();
            break;
        case 'ArrowRight':
            if(person.rot === -1) {
                person.rot = 0;
            }
            evt.preventDefault();
            break;
    }
});
