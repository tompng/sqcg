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
        normals.push(p.nx, p.ny, p.nz)
      }
      indices.push(index)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}

const vertexCode = `
precision mediump float;
varying vec2 vtexcoord;
varying vec3 vnormal;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vnormal = normalMatrix * normal;
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
  const width = 800
  const height = 600
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0, 4)
  const texcanvas = document.createElement('canvas')
  texcanvas.width = texcanvas.height = 256
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
  for (const section of ikaSections) {
    const mesh = new THREE.Mesh(geometryFromIkaSection(section), ikaShader({
      map: { value: texture },

    }))
    meshes.push(mesh)
    mesh.position.x = section.xmin
    mesh.position.y = section.ymin
    mesh.scale.x = mesh.scale.y = mesh.scale.z = section.size
    scene.add(mesh)
  }
  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.position.set(1, 2, 3)
  scene.add(directionalLight)
  function animate() {
    const t = performance.now() / 1000
    const zcos = Math.cos(0.24 * t)
    const zsin = Math.sin(0.24 * t)
    camera.position.set(4 * Math.cos(0.2 * t) * zsin, 4 * Math.sin(0.3 * t) * zsin, 4 * zcos)
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
})
