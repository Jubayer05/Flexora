import CustomImage from '@/components/common/CustomImage'
import CustomLink from '@/components/common/CustomLink'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PromotionalIconType } from '@/lib/validations/schemas/promotionalIcon'

export default function PromotionalIcons({ data }: { data?: PromotionalIconType[] }) {
  return (
    <div className='flex items-center gap-x-2'>
      {data &&
        data?.map((item: PromotionalIconType, idx: number) => (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <CustomLink
                href={item?.url || '#'}
                className='group relative inline-flex justify-center items-center rounded-full size-9 shrink-0 border border-border/60 bg-background/40 text-muted-foreground transition-all hover:text-foreground hover:bg-accent/70 hover:border-primary/30 shadow-sm'
                target='_blank'
                rel='noopener noreferrer'
                title={item.name}
              >
                <span className='pointer-events-none absolute inset-0 rounded-full bg-primary/0 blur-md transition-all duration-300 group-hover:bg-primary/10' />
                <CustomImage
                  src={item.icon}
                  alt={item.name}
                  width={20}
                  height={20}
                  className='relative object-contain size-5'
                  unoptimized
                />
              </CustomLink>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              <span className='font-medium'>{item.name}</span>
            </TooltipContent>
          </Tooltip>
        ))}
    </div>
  )
}
