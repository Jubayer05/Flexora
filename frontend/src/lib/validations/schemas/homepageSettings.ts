import { z } from 'zod'

// === Base Schemas ===
const optionalString = z.string().optional()

// === Reusable Content Block Schemas ===
export const titleSubtitleDescSchema = z.object({
  title: optionalString,
  subTitle: optionalString,
  desc: optionalString
})

const facilityItemSchema = z.object({
  title: optionalString,
  desc: optionalString,
  icon: optionalString
})

const statItemSchema = z.object({
  title: optionalString,
  count: optionalString
})

// === Complex Component Schemas ===
const heroSectionSchema = titleSubtitleDescSchema
const gameChangerSectionSchema = titleSubtitleDescSchema
const agencySectionSchema = z.object({
  title: optionalString,
  agencies: z.array(optionalString).default([])
})
const whyChooseSectionSchema = titleSubtitleDescSchema.extend({
  facilities: z.array(facilityItemSchema).default([])
})
const howToWorksSchema = titleSubtitleDescSchema.extend({
  facilities: z.array(facilityItemSchema).default([])
})
const offersSectionSchema = titleSubtitleDescSchema
const aboutSectionSchema = titleSubtitleDescSchema.extend({
  image: optionalString,
  stats: z.array(statItemSchema).default([])
})
const categoriesSectionSchema = titleSubtitleDescSchema
const platformSectionSchema = titleSubtitleDescSchema
const subscribeSectionSchema = titleSubtitleDescSchema

// === Main Homepage Settings Schema ===
export const homepageSettingsSchema = z
  .object({
    hero: heroSectionSchema.optional(),
    gameChanger: gameChangerSectionSchema.optional(),
    agency: agencySectionSchema.optional(),
    whyChoose: whyChooseSectionSchema.optional(),
    howToWorks: howToWorksSchema.optional(),
    offers: offersSectionSchema.optional(),
    about: aboutSectionSchema.optional(),
    categories: categoriesSectionSchema.optional(),
    platform: platformSectionSchema.optional(),
    feedback: titleSubtitleDescSchema.optional(),
    subscribe: subscribeSectionSchema.optional()
  })
  .strict()

// === Type Exports ===
export type HomepageSettings = z.infer<typeof homepageSettingsSchema>

// Section-specific types for better modularity
export type HeroSection = z.infer<typeof heroSectionSchema>
export type GameChangerSection = z.infer<typeof gameChangerSectionSchema>
export type AgencySection = z.infer<typeof agencySectionSchema>
export type WhyChooseSection = z.infer<typeof whyChooseSectionSchema>
export type HowItWorksSection = z.infer<typeof howToWorksSchema>
export type OffersSection = z.infer<typeof offersSectionSchema>
export type AboutSection = z.infer<typeof aboutSectionSchema>
export type CategoriesSection = z.infer<typeof categoriesSectionSchema>
export type PlatformSection = z.infer<typeof platformSectionSchema>
export type SubscribeSection = z.infer<typeof subscribeSectionSchema>

// Utility types for form components
export type FacilityItem = z.infer<typeof facilityItemSchema>
export type StatItem = z.infer<typeof statItemSchema>

// === Schema Validation Helpers ===
export const validateHomepageSettings = (data: unknown) => {
  return homepageSettingsSchema.safeParse(data)
}

export const validateSection = <T>(schema: z.ZodType<T>, data: unknown) => {
  return schema.safeParse(data)
}
