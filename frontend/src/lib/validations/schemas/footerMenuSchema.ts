import { z } from 'zod'

// Footer Menu Child Item Schema
export const footerMenuChildSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['EXTERNAL', 'HYBRID']).default('EXTERNAL'),
  url: z.string().min(1, 'URL is required')
})

// Footer Menu Group Schema
export const footerMenuGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required'),
  children: z.array(footerMenuChildSchema).min(1, 'At least one menu item is required')
})

// Footer Settings Schema
export const footerSettingsSchema = z.object({
  footerMenus: z.array(footerMenuGroupSchema).min(1, 'At least one menu group is required')
})

// Type Exports
export type FooterMenuChild = z.infer<typeof footerMenuChildSchema>
export type FooterMenuGroup = z.infer<typeof footerMenuGroupSchema>
export type FooterSettings = z.infer<typeof footerSettingsSchema>

// Original type for reference (transformed to match schema)
export type TFooterSetting = FooterMenuGroup[]
