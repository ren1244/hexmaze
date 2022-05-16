import * as THREE from 'three';
const wallLength = 4;
const wallThickness = 0.5;
const wallHeight = 3;
const hL = wallLength / 2;
const hT = wallThickness / 2;
const scale = wallLength / 1000;

function getVerticesAndNormals(points, planes) {
	let vertices = new Float32Array(planes.length * 3);
	let normals = new Float32Array(planes.length * 3);
	let nPlaneMin2 = planes.length - 2;
	let verticesIdx = 0, normalsIdx = 0;
	for (let i = 0; i < nPlaneMin2; i += 3) {
		//取得 3 個點的 x, y, z
		let k = planes[i] * 3;
		let ax = vertices[verticesIdx++] = points[k];
		let ay = vertices[verticesIdx++] = points[k + 1]
		let az = vertices[verticesIdx++] = points[k + 2];
		k = planes[i + 1] * 3;
		let bx = vertices[verticesIdx++] = points[k];
		let by = vertices[verticesIdx++] = points[k + 1]
		let bz = vertices[verticesIdx++] = points[k + 2];
		k = planes[i + 2] * 3;
		let cx = vertices[verticesIdx++] = points[k];
		let cy = vertices[verticesIdx++] = points[k + 1]
		let cz = vertices[verticesIdx++] = points[k + 2];
		//計算外積為法線方向(右手定則決定)
		cx -= bx;
		cy -= by;
		cz -= bz;
		bx -= ax;
		by -= ay;
		bz -= az;
		ax = by * cz - bz * cy;
		ay = bz * cx - bx * cz;
		az = bx * cy - by * cx;
		k = Math.sqrt(ax * ax + ay * ay + az * az);
		ax /= k;
		ay /= k;
		az /= k;
		normals[normalsIdx++] = ax;
		normals[normalsIdx++] = ay;
		normals[normalsIdx++] = az;
		normals[normalsIdx++] = ax;
		normals[normalsIdx++] = ay;
		normals[normalsIdx++] = az;
		normals[normalsIdx++] = ax;
		normals[normalsIdx++] = ay;
		normals[normalsIdx++] = az;
	}
	return [vertices, normals];
}

function buildWall(points, planes, color) {
	let [vertices, normals] = getVerticesAndNormals(points, planes);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
	const material = new THREE.MeshLambertMaterial({
		color: color
	});
	return new THREE.Mesh(geometry, material);
}

let tmpY = hL - hT / Math.sqrt(3);
let points = [
	0, hL, 0,
	-hT, tmpY, 0,
	-hT, -tmpY, 0,
	0, -hL, 0,
	hT, -tmpY, 0,
	hT, tmpY, 0,

	0, hL, wallHeight,
	-hT, tmpY, wallHeight,
	-hT, -tmpY, wallHeight,
	0, -hL, wallHeight,
	hT, -tmpY, wallHeight,
	hT, tmpY, wallHeight,
];
let planes = [
	0, 1, 6, 1, 7, 6,
	1, 2, 7, 2, 8, 7,
	2, 3, 8, 3, 9, 8,
	3, 4, 9, 4, 10, 9,
	4, 5, 10, 5, 11, 10,
	5, 0, 11, 0, 6, 11,
	8, 9, 10, 8, 10, 11,
	8, 11, 7, 7, 11, 6
];

const theta = Math.atan2(866, 500);
const wallTemplate1 = buildWall(points, planes, '#cccc00');
const wallTemplate0 = buildWall(points, planes, '#cccc00');
const wallTemplate2 = buildWall(points, planes, '#cccc00');
wallTemplate0.rotation.z = -theta;
wallTemplate2.rotation.z = theta;

function createWall(x1, y1, x2, y2) {
	let wall;
	let d = (x2 - x1) * (y2 - y1);
	if (d === 0) {
		wall = wallTemplate1.clone();
	} else if (d > 0) {
		wall = wallTemplate0.clone();
	} else {
		wall = wallTemplate2.clone();
	}
	wall.position.set((x1 + x2) * scale / 2, (y1 + y2) * scale / 2);
	return wall;
}

export { createWall };