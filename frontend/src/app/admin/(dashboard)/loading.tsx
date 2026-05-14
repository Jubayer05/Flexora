import MotionLoader from '@/components/common/MotionLoader'

export default function loading() {
  return (
    <div className='top-0 left-0 z-20 absolute inset-0 flex justify-center items-center bg-background/30 backdrop-blur-sm w-full h-screen overflow-hidden!'>
      <MotionLoader size='lg' variant='dots' />
    </div>
  )
}
