'use client'

import { useRef, Suspense } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sphere, Line } from '@react-three/drei'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { GameChangerSection } from '@/lib/validations/schemas/homepageSettings'

const FloatingBadge = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
    className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/40 shadow-md'
  >
    {children}
  </motion.div>
)

function Globe3D() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Main globe sphere */}
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.1}
          transparent
          opacity={0.15}
          roughness={0.8}
        />
      </Sphere>

      {/* Wireframe globe */}
      <Sphere args={[1, 16, 16]}>
        <meshBasicMaterial color="#818cf8" wireframe transparent opacity={0.4} />
      </Sphere>

      {/* Globe rings */}
      <Sphere args={[1.2, 16, 16]}>
        <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.2} />
      </Sphere>

      {/* Equatorial ring */}
      <Line
        points={[
          [-1.5, 0, 0],
          [1.5, 0, 0],
        ]}
        color="#6366f1"
        lineWidth={1.5}
        transparent
        opacity={0.5}
      />

      {/* Vertical ring */}
      <Line
        points={[
          [0, -1.5, 0],
          [0, 1.5, 0],
        ]}
        color="#6366f1"
        lineWidth={1.5}
        transparent
        opacity={0.5}
      />

      {/* Diagonal rings for 3D effect */}
      <Line
        points={[
          [-1.5, -1.5, 0],
          [1.5, 1.5, 0],
        ]}
        color="#818cf8"
        lineWidth={1}
        transparent
        opacity={0.3}
      />
      <Line
        points={[
          [-1.5, 1.5, 0],
          [1.5, -1.5, 0],
        ]}
        color="#818cf8"
        lineWidth={1}
        transparent
        opacity={0.3}
      />

      {/* Connection nodes */}
      {[
        [0, 1.3, 0],
        [0, -1.3, 0],
        [1.3, 0, 0],
        [-1.3, 0, 0],
        [0.9, 0.9, 0],
        [-0.9, 0.9, 0],
        [0.9, -0.9, 0],
        [-0.9, -0.9, 0],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#a5b4fc" />
        </mesh>
      ))}

      {/* Interactive orbit controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
      />
    </Canvas>
  )
}

function GlobeFallback() {
  return (
    <div className='w-full h-full flex items-center justify-center'>
      <div className='w-32 h-32 rounded-full bg-primary/20 animate-pulse' />
    </div>
  )
}

function InteractiveGlobe() {
  return (
    <div className='w-full h-full cursor-grab active:cursor-grabbing'>
      <Suspense fallback={<GlobeFallback />}>
        <Globe3D />
      </Suspense>
    </div>
  )
}

export default function TestimonialOne({ data }: { data?: GameChangerSection }) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: undefined,
    offset: ['start end', 'end start'],
  })

  const smoothY = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  const y1 = useTransform(smoothY, [0, 1], [30, -30])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  if (!data?.desc) return null

  const words = data.desc.split(' ')

  return (
    <Section variant='xl' className='relative overflow-hidden py-20 lg:py-28'>
      <Container>
        <motion.div ref={ref} style={{ opacity }} className='relative'>
          {/* Main content card */}
          <div className='relative bg-card rounded-3xl border border-border/60 shadow-xl shadow-primary/5 overflow-hidden'>
            <div className='grid lg:grid-cols-2 gap-0'>
              {/* Left side - 3D Globe */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                viewport={{ once: true }}
                className='relative h-72 lg:h-auto lg:min-h-[500px] bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 flex items-center justify-center p-4 lg:p-8'
              >
                <div className='w-full max-w-[350px] lg:max-w-[400px] aspect-square'>
                  <InteractiveGlobe />
                </div>

                {/* Mobile stats overlay */}
                <div className='absolute bottom-0 left-0 right-0 p-6 lg:hidden bg-gradient-to-t from-card to-transparent'>
                  <div className='flex justify-center gap-6'>
                    {[
                      { value: '10K+', label: 'Customers' },
                      { value: '50+', label: 'Countries' },
                      { value: '4.9', label: 'Rating' },
                    ].map((stat, i) => (
                      <div key={i} className='text-center'>
                        <Typography variant='h4' weight='bold' className='text-primary text-base'>
                          {stat.value}
                        </Typography>
                        <Typography variant='caption' className='text-muted-foreground'>
                          {stat.label}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Right side - Content section */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                viewport={{ once: true }}
                style={{ y: y1 }}
                className='relative p-8 lg:p-12 xl:p-16 flex flex-col justify-center'
              >
                {/* Decorative quote mark */}
                <div className='absolute top-4 right-8 text-primary/5 pointer-events-none'>
                  <svg width='120' height='120' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M11.192 15.757c0-.88-.23-1.618-.69-2.217-.326-.412-.768-.683-1.327-.812-.55-.128-1.07-.137-1.54-.028-.16-.95.1-1.95.76-3 .66-1.05 1.63-1.755 2.91-2.12 1.28-.365 2.53-.3 3.75.19.6.72.91 1.63.91 2.75 0 1.1-.28 2.01-.83 2.75-.55.73-1.32 1.32-2.29 1.75l-1.23-1.91c.65-.35 1.16-.82 1.55-1.42.38-.6.57-1.25.57-1.95zM21.923 15.67c0-.88-.23-1.618-.69-2.217-.326-.42-.77-.69-1.327-.82-.55-.12-1.07-.13-1.54-.02-.16-.94.09-1.95.75-3 .66-1.05 1.63-1.755 2.91-2.12 1.28-.37 2.53-.3 3.75.19.6.72.91 1.63.91 2.75 0 1.1-.28 2.01-.83 2.75-.55.73-1.32 1.32-2.29 1.75l-1.23-1.91c.65-.35 1.16-.82 1.55-1.42.38-.6.57-1.25.57-1.95z' fill='currentColor'/>
                  </svg>
                </div>

                {/* Badge */}
                <FloatingBadge>
                  <span className='w-2 h-2 bg-primary rounded-full animate-pulse' />
                  <Typography variant='caption' weight='medium' className='text-primary uppercase tracking-wider'>
                    What People Say
                  </Typography>
                </FloatingBadge>

                {/* Heading */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className='text-3xl lg:text-4xl font-bold tracking-tight mt-6 mb-6'
                >
                  <span className='text-foreground'>Trusted by </span>
                  <span className='text-primary'>Creators</span>
                  <span className='text-foreground'> Worldwide</span>
                </motion.h2>

                {/* Testimonial text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                  className='mb-8'
                >
                  <Typography
                    variant='body1'
                    weight='normal'
                    className='text-muted-foreground text-base lg:text-lg leading-relaxed'
                  >
                    {words.map((word, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.5 + i * 0.03 }}
                        viewport={{ once: true }}
                        className='inline-block mr-1'
                      >
                        {word}
                      </motion.span>
                    ))}
                  </Typography>
                </motion.div>

                {/* Game changer badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <div className='inline-flex items-center gap-3 px-5 py-3 rounded-full bg-primary/10 border border-primary/30'>
                    <span className='w-2.5 h-2.5 bg-primary rounded-full' />
                    <Typography variant='body2' weight='semibold' className='text-primary'>
                      Game changer!
                    </Typography>
                  </div>
                </motion.div>

                {/* Desktop stats row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  viewport={{ once: true }}
                  className='hidden lg:flex items-center gap-10 mt-10 pt-8 border-t border-border/40'
                >
                  {[
                    { value: '10,000+', label: 'Happy Customers' },
                    { value: '50+', label: 'Countries Served' },
                    { value: '4.9/5', label: 'Customer Rating' },
                  ].map((stat, i) => (
                    <div key={i} className='text-center'>
                      <Typography variant='h4' weight='bold' className='text-2xl text-primary'>
                        {stat.value}
                      </Typography>
                      <Typography variant='caption' className='text-muted-foreground'>
                        {stat.label}
                      </Typography>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  )
}
