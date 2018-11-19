onload = () => {
  const canvas = document.createElement('canvas')
  const size = 1024
  canvas.width = canvas.height = size
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.scale(size / 4, size / 4)
  ctx.lineWidth = 0.01
  ctx.beginPath()
  ctx.curve(ikachanCoords(), true)
  ctx.stroke()
  sqDrawEyes(ctx)
}

const ikaTriangles = coordsShrink3D()
const ikaSections = []
const subTriStep = 4
for (let i = -subTriStep; i < subTriStep; i++) {
  for (let j = -subTriStep; j < subTriStep; j++) {
    const xmin = i / subTriStep * 1.3 + 0.3
    const ymin = j / subTriStep * 1.3
    const size = 1.3 / subTriStep
    const tris = trimTriangles(ikaTriangles, xmin, ymin, size)
    if (tris.length) ikaSections.push({ triangles: tris, xmin, ymin, size })
  }
}

function geometryFromIkaSection(section) {
  const vertices = []
  const indices = []
  const normals = []
  const tan1 = []
  const tan2 = []
  const uvs = []
  const indicesMap = {}
  const r0 = Math.sqrt(section.xmin ** 2 + section.ymin ** 2)
  for (const triangle of section.triangles) {
    for (const p of triangle) {
      const key = [p.x, p.y, p.z]
      let index = indicesMap[key]
      if (index === undefined) {
        index = vertices.length / 3
        indicesMap[key] = index
        if (p.z < 0.5) {
          uvs.push((section.xmin / r0 + 1) / 2, (section.ymin / r0 + 1) / 2)
        } else {
          const x = section.xmin + section.size * p.x
          const y = section.ymin + section.size * p.y
          uvs.push((x + 1) / 2, (y + 1) / 2)
        }
        vertices.push(p.x, p.y, p.z)
        let t1
        if (p.nz === 0) {
          t1 = { x: 0, y: 0, z: 1 }
        } else {
          const tr = Math.sqrt(1 + (p.nx / p.nz) ** 2)
          t1 = { x: 1 / tr, y: 0, z: -p.nx / p.nz / tr}
        }
        const t2 = {
          x: t1.z * p.ny - t1.y * p.nz,
          y: t1.x * p.nz - t1.z * p.nx,
          z: t1.y * p.nx - t1.x * p.ny,
        }
        normals.push(p.nx, p.ny, p.nz)
        tan1.push(t1.x, t1.y, t1.z)
        tan2.push(t2.x, t2.y, t2.z)
      }
      indices.push(index)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.addAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1), 3))
  geometry.addAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2), 3))
  geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}

const vertexCode = `
precision mediump float;
varying vec2 vtexcoord;
varying vec3 vnormal;
uniform vec3 v000, v001, v010, v011, v100, v101, v110, v111;
uniform vec3 vx000, vx001, vx010, vx011, vx100, vx101, vx110, vx111;
uniform vec3 vy000, vy001, vy010, vy011, vy100, vy101, vy110, vy111;
uniform vec3 vz000, vz001, vz010, vz011, vz100, vz101, vz110, vz111;
attribute vec3 tan1, tan2;
vec3 tangentTransform(vec3 p, vec3 delta) {
  vec3 a1 = p * p * (3.0 - 2.0 * p);
  vec3 a0 = 1.0 - a1;
  vec3 b0 = p * (1.0 - p) * (1.0 - p);
  vec3 b1 = p * p * (p - 1.0);
  vec3 da1 = 6.0 * p * (1.0 - p) * delta;
  vec3 da0 = -da1;
  vec3 db0 = (1.0 + p * (3.0 * p - 4.0)) * delta;
  vec3 db1 = p * (3.0 * p - 2.0) * delta;
  return (
    v000 * (da0.x * a0.y * a0.z + a0.x * da0.y * a0.z + a0.x * a0.y * da0.z)+
    v001 * (da0.x * a0.y * a1.z + a0.x * da0.y * a1.z + a0.x * a0.y * da1.z)+
    v010 * (da0.x * a1.y * a0.z + a0.x * da1.y * a0.z + a0.x * a1.y * da0.z)+
    v011 * (da0.x * a1.y * a1.z + a0.x * da1.y * a1.z + a0.x * a1.y * da1.z)+
    v100 * (da1.x * a0.y * a0.z + a1.x * da0.y * a0.z + a1.x * a0.y * da0.z)+
    v101 * (da1.x * a0.y * a1.z + a1.x * da0.y * a1.z + a1.x * a0.y * da1.z)+
    v110 * (da1.x * a1.y * a0.z + a1.x * da1.y * a0.z + a1.x * a1.y * da0.z)+
    v111 * (da1.x * a1.y * a1.z + a1.x * da1.y * a1.z + a1.x * a1.y * da1.z)+
    vx000 * (db0.x * a0.y * a0.z + b0.x * da0.y * a0.z + b0.x * a0.y * da0.z)+
    vx001 * (db0.x * a0.y * a1.z + b0.x * da0.y * a1.z + b0.x * a0.y * da1.z)+
    vx010 * (db0.x * a1.y * a0.z + b0.x * da1.y * a0.z + b0.x * a1.y * da0.z)+
    vx011 * (db0.x * a1.y * a1.z + b0.x * da1.y * a1.z + b0.x * a1.y * da1.z)+
    vx100 * (db1.x * a0.y * a0.z + b1.x * da0.y * a0.z + b1.x * a0.y * da0.z)+
    vx101 * (db1.x * a0.y * a1.z + b1.x * da0.y * a1.z + b1.x * a0.y * da1.z)+
    vx110 * (db1.x * a1.y * a0.z + b1.x * da1.y * a0.z + b1.x * a1.y * da0.z)+
    vx111 * (db1.x * a1.y * a1.z + b1.x * da1.y * a1.z + b1.x * a1.y * da1.z)+
    vy000 * (da0.x * b0.y * a0.z + a0.x * db0.y * a0.z + a0.x * b0.y * da0.z)+
    vy001 * (da0.x * b0.y * a1.z + a0.x * db0.y * a1.z + a0.x * b0.y * da1.z)+
    vy010 * (da0.x * b1.y * a0.z + a0.x * db1.y * a0.z + a0.x * b1.y * da0.z)+
    vy011 * (da0.x * b1.y * a1.z + a0.x * db1.y * a1.z + a0.x * b1.y * da1.z)+
    vy100 * (da1.x * b0.y * a0.z + a1.x * db0.y * a0.z + a1.x * b0.y * da0.z)+
    vy101 * (da1.x * b0.y * a1.z + a1.x * db0.y * a1.z + a1.x * b0.y * da1.z)+
    vy110 * (da1.x * b1.y * a0.z + a1.x * db1.y * a0.z + a1.x * b1.y * da0.z)+
    vy111 * (da1.x * b1.y * a1.z + a1.x * db1.y * a1.z + a1.x * b1.y * da1.z)+
    vz000 * (da0.x * a0.y * b0.z + a0.x * da0.y * b0.z + a0.x * a0.y * db0.z)+
    vz001 * (da0.x * a0.y * b1.z + a0.x * da0.y * b1.z + a0.x * a0.y * db1.z)+
    vz010 * (da0.x * a1.y * b0.z + a0.x * da1.y * b0.z + a0.x * a1.y * db0.z)+
    vz011 * (da0.x * a1.y * b1.z + a0.x * da1.y * b1.z + a0.x * a1.y * db1.z)+
    vz100 * (da1.x * a0.y * b0.z + a1.x * da0.y * b0.z + a1.x * a0.y * db0.z)+
    vz101 * (da1.x * a0.y * b1.z + a1.x * da0.y * b1.z + a1.x * a0.y * db1.z)+
    vz110 * (da1.x * a1.y * b0.z + a1.x * da1.y * b0.z + a1.x * a1.y * db0.z)+
    vz111 * (da1.x * a1.y * b1.z + a1.x * da1.y * b1.z + a1.x * a1.y * db1.z)
  );
}
vec3 transform(vec3 p) {
  vec3 a1 = p * p * (3.0 - 2.0 * p);
  vec3 a0 = 1.0 - a1;
  vec3 b0 = p * (1.0 - p) * (1.0 - p);
  vec3 b1 = p * p * (p - 1.0);
  return (
    v000 * a0.x * a0.y * a0.z +
    v001 * a0.x * a0.y * a1.z +
    v010 * a0.x * a1.y * a0.z +
    v011 * a0.x * a1.y * a1.z +
    v100 * a1.x * a0.y * a0.z +
    v101 * a1.x * a0.y * a1.z +
    v110 * a1.x * a1.y * a0.z +
    v111 * a1.x * a1.y * a1.z +
    vx000 * b0.x * a0.y * a0.z +
    vx001 * b0.x * a0.y * a1.z +
    vx010 * b0.x * a1.y * a0.z +
    vx011 * b0.x * a1.y * a1.z +
    vx100 * b1.x * a0.y * a0.z +
    vx101 * b1.x * a0.y * a1.z +
    vx110 * b1.x * a1.y * a0.z +
    vx111 * b1.x * a1.y * a1.z +
    vy000 * a0.x * b0.y * a0.z +
    vy001 * a0.x * b0.y * a1.z +
    vy010 * a0.x * b1.y * a0.z +
    vy011 * a0.x * b1.y * a1.z +
    vy100 * a1.x * b0.y * a0.z +
    vy101 * a1.x * b0.y * a1.z +
    vy110 * a1.x * b1.y * a0.z +
    vy111 * a1.x * b1.y * a1.z +
    vz000 * a0.x * a0.y * b0.z +
    vz001 * a0.x * a0.y * b1.z +
    vz010 * a0.x * a1.y * b0.z +
    vz011 * a0.x * a1.y * b1.z +
    vz100 * a1.x * a0.y * b0.z +
    vz101 * a1.x * a0.y * b1.z +
    vz110 * a1.x * a1.y * b0.z +
    vz111 * a1.x * a1.y * b1.z
  );
}
void main() {
  vec3 pos = transform(position);
  vec3 ta = tangentTransform(position, tan1);
  vec3 tb = tangentTransform(position, tan2);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1);
  vnormal = normalize(cross(ta, tb));
  vtexcoord = uv.xy;
}
`
const fragmentCode = `
precision mediump float;
uniform sampler2D map;
varying vec2 vtexcoord;
varying vec3 vnormal;
void main() {
  float shadow = 0.5 + 0.5 * dot(normalize(vnormal), vec3(0.48, 0.64, 0.6));
  gl_FragColor.rgb = texture2D(map, vtexcoord).rgb * shadow;
}
`

function ikaShader(uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: vertexCode,
    fragmentShader: fragmentCode,
    uniforms
  });
}

window.addEventListener('load', () => {
  function showMap(map) {
    const size = map.length
    const c=document.createElement('canvas')
    c.width = c.height = size
    c.style.width = size/2
    const g = c.getContext('2d')
    const d = g.createImageData(size, size)
    each2D(size, (i, j) => {
      const k = 4 * (j * size + i)
      const v = map[i][j]
      d.data[k+0] = v * 0xff
      d.data[k+1] = v * 0xff
      d.data[k+2] = v * 0xff
      d.data[k+3] = 0xff
    })
    window.m=map
    g.putImageData(d, 0, 0)
    document.body.appendChild(c)
  }

  const c=document.createElement('canvas')
  const size = c.width = c.height = 1024
  const g = c.getContext('2d')
  g.translate(size / 2, size / 2)
  g.scale(size / 4, size / 4)
  g.beginPath()
  g.fillStyle = 'rgba(0, 0, 0, 0.2)'
  g.strokeStyle = 'red'
  g.lineWidth = 0.001
  for (const section of ikaSections) {
    g.save()
    g.translate(section.xmin, section.ymin)
    g.scale(section.size, section.size)
    for (const tri of section.triangles) {
      const [a, b, c] = tri
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      g.lineTo(c.x, c.y)
      g.closePath()
      g.fill()
      g.stroke()
    }
    g.restore()
  }
  document.body.appendChild(c)

  const renderer = new THREE.WebGLRenderer()
  document.body.appendChild(renderer.domElement)
  renderer.domElement.style.boxShadow = '0 0 1px black'
  const width = 1200
  const height = 900
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0, 4)
  const texcanvas = document.createElement('canvas')
  texcanvas.width = texcanvas.height = 512
  const texctx = texcanvas.getContext('2d')
  texctx.scale(texcanvas.width, texcanvas.height)
  texctx.fillStyle = '#fa4'
  texctx.fillRect(0, 0, 1, 1)
  texctx.translate(0.5, 0.5)
  texctx.scale(0.5, 0.5)
  sqDrawEyes(texctx)

  const texture = new THREE.Texture(texcanvas)
  texture.needsUpdate = true
  const meshes = []
  for (const sec of ikaSections) {
    const mesh = new THREE.Mesh(geometryFromIkaSection(sec), ikaShader({ map: { value: texture } }))
    mesh.updateMorph = (a, b, c) => {
      const fv = (x, y, z) => new THREE.Vector3(x + 0.1 * Math.sin(a * x - 4 * c), y, z + 0.1 * Math.sin(a * x + b * y + c))
      const fx = (x, y, z) => new THREE.Vector3(sec.size + 0.1 * a * sec.size * Math.cos(a * x - 4 * c), 0, 0.1 * sec.size * a * Math.cos(a * x + b * y + c))
      const fy = (x, y, z) => new THREE.Vector3(0, sec.size, 0.1 * sec.size * b *  Math.cos(a * x + b * y + c))
      const fz = (x, y, z) => new THREE.Vector3(0, 0, 1)
      const uniforms = {
        v000: { value: fv(sec.xmin, sec.ymin, -0.5) },
        v001: { value: fv(sec.xmin, sec.ymin, 0.5) },
        v010: { value: fv(sec.xmin, sec.ymin + sec.size, -0.5) },
        v011: { value: fv(sec.xmin, sec.ymin + sec.size, 0.5) },
        v100: { value: fv(sec.xmin + sec.size, sec.ymin, -0.5) },
        v101: { value: fv(sec.xmin + sec.size, sec.ymin, 0.5) },
        v110: { value: fv(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        v111: { value: fv(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
        vx000: { value: fx(sec.xmin, sec.ymin, -0.5) },
        vx001: { value: fx(sec.xmin, sec.ymin, 0.5) },
        vx010: { value: fx(sec.xmin, sec.ymin + sec.size, -0.5) },
        vx011: { value: fx(sec.xmin, sec.ymin + sec.size, 0.5) },
        vx100: { value: fx(sec.xmin + sec.size, sec.ymin, -0.5) },
        vx101: { value: fx(sec.xmin + sec.size, sec.ymin, 0.5) },
        vx110: { value: fx(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        vx111: { value: fx(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
        vy000: { value: fy(sec.xmin, sec.ymin, -0.5) },
        vy001: { value: fy(sec.xmin, sec.ymin, 0.5) },
        vy010: { value: fy(sec.xmin, sec.ymin + sec.size, -0.5) },
        vy011: { value: fy(sec.xmin, sec.ymin + sec.size, 0.5) },
        vy100: { value: fy(sec.xmin + sec.size, sec.ymin, -0.5) },
        vy101: { value: fy(sec.xmin + sec.size, sec.ymin, 0.5) },
        vy110: { value: fy(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        vy111: { value: fy(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
        vz000: { value: fz(sec.xmin, sec.ymin, -0.5) },
        vz001: { value: fz(sec.xmin, sec.ymin, 0.5) },
        vz010: { value: fz(sec.xmin, sec.ymin + sec.size, -0.5) },
        vz011: { value: fz(sec.xmin, sec.ymin + sec.size, 0.5) },
        vz100: { value: fz(sec.xmin + sec.size, sec.ymin, -0.5) },
        vz101: { value: fz(sec.xmin + sec.size, sec.ymin, 0.5) },
        vz110: { value: fz(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        vz111: { value: fz(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
      }
      for (const name in uniforms) mesh.material.uniforms[name] = uniforms[name]
    }
    meshes.push(mesh)
    scene.add(mesh)
  }
  const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshPhongMaterial())
  plane.position.set(0, 0, 0)
  plane.scale.set(3, 3, 3)
  scene.add(plane)
  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.position.set(1, 2, 3)
  scene.add(directionalLight)
  function animate() {
    const t = performance.now() / 1000
    const zcos = Math.cos(0.24 * t)
    const zsin = Math.sin(0.24 * t)
    for (const mesh of meshes){
      mesh.updateMorph(4 * Math.cos(t), 4 * Math.sin(t), 4 * t)
    }
    // camera.position.set(4 * Math.cos(0.2 * t) * zsin, 4 * Math.sin(0.2 * t) * zsin, 4 * zcos)
    camera.position.set(4 * Math.cos(0.2 * t) * zsin, 4 * Math.sin(0.2 * t) * zsin, 3)
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
})
