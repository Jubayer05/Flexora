'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import {
  type HomepageSettings,
  homepageSettingsSchema
} from '@/lib/validations/schemas/homepageSettings'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import IconPickerModal from '../../common/IconPickerModal'

type TProps = {
  settingsKey: string
  initialValues?: HomepageSettings | undefined
  refetch?: () => void
}

const HomepageSettings = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(homepageSettingsSchema),
    defaultValues: {
      hero: {
        title: initialValues?.hero?.title || '',
        subTitle: initialValues?.hero?.subTitle || '',
        desc: initialValues?.hero?.desc || ''
      },
      gameChanger: {
        title: initialValues?.gameChanger?.title || '',
        subTitle: initialValues?.gameChanger?.subTitle || '',
        desc: initialValues?.gameChanger?.desc || ''
      },
      agency: {
        title: initialValues?.agency?.title || '',
        agencies: initialValues?.agency?.agencies || []
      },
      whyChoose: {
        title: initialValues?.whyChoose?.title || '',
        subTitle: initialValues?.whyChoose?.subTitle || '',
        desc: initialValues?.whyChoose?.desc || '',
        facilities: initialValues?.whyChoose?.facilities || []
      },
      howToWorks: {
        title: initialValues?.howToWorks?.title || '',
        subTitle: initialValues?.howToWorks?.subTitle || '',
        desc: initialValues?.howToWorks?.desc || '',
        facilities: initialValues?.howToWorks?.facilities || []
      },
      offers: {
        title: initialValues?.offers?.title || '',
        subTitle: initialValues?.offers?.subTitle || '',
        desc: initialValues?.offers?.desc || ''
      },
      about: {
        title: initialValues?.about?.title || '',
        subTitle: initialValues?.about?.subTitle || '',
        desc: initialValues?.about?.desc || '',
        image: initialValues?.about?.image || '',
        stats: initialValues?.about?.stats || []
      },
      categories: {
        title: initialValues?.categories?.title || '',
        subTitle: initialValues?.categories?.subTitle || '',
        desc: initialValues?.categories?.desc || ''
      },
      feedback: {
        title: initialValues?.feedback?.title || '',
        subTitle: initialValues?.feedback?.subTitle || '',
        desc: initialValues?.feedback?.desc || ''
      },
      platform: {
        title: initialValues?.platform?.title || '',
        subTitle: initialValues?.platform?.subTitle || '',
        desc: initialValues?.platform?.desc || ''
      },
      subscribe: {
        title: initialValues?.subscribe?.title || '',
        subTitle: initialValues?.subscribe?.subTitle || '',
        desc: initialValues?.subscribe?.desc || ''
      }
    }
  })

  const {
    fields: facilitiesFields,
    append: appendFacility,
    remove: removeFacility
  } = useFieldArray({
    control,
    name: 'whyChoose.facilities'
  })

  const {
    fields: howToFields,
    append: appendHowTo,
    remove: removeHowTo
  } = useFieldArray({
    control,
    name: 'howToWorks.facilities'
  })

  const {
    fields: statisticsFields,
    append: appendStatistic,
    remove: removeStatistic
  } = useFieldArray({
    control,
    name: 'about.stats'
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('Settings updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='hero.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter site name'
                  error={errors.hero?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='hero.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Brief description of the site'
                  error={errors.hero?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Changer Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='gameChanger.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Enter game changer description'
                  error={errors.gameChanger?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agency Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='agency.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter agency section title'
                  error={errors.agency?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <div className='space-y-2'>
              <label className='font-medium text-sm'>Agencies</label>
              <Controller
                control={control}
                name='agency.agencies'
                render={({ field }) => (
                  <FileUploader
                    value={
                      Array.isArray(field.value)
                        ? field.value.filter((v): v is string => typeof v === 'string')
                        : field.value || ''
                    }
                    onChangeAction={field.onChange}
                    maxAllow={8}
                    multiple
                    size='extra-large'
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Why Choose Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='whyChoose.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter why choose title'
                  error={errors.whyChoose?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='whyChoose.subTitle'
              render={({ field }) => (
                <CustomInput
                  label='Sub Title'
                  placeholder='Enter why choose subtitle'
                  error={errors.whyChoose?.subTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='whyChoose.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Enter why choose description'
                  error={errors.whyChoose?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <div className='space-y-2 lg:col-span-2'>
              <div className='flex justify-between items-center'>
                <label className='font-medium text-sm'>Facilities</label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => appendFacility({ title: '', desc: '', icon: '' })}
                  className='flex items-center gap-2'
                >
                  <Plus className='w-4 h-4' />
                  Add Facility
                </Button>
              </div>

              {facilitiesFields.length === 0 ? (
                <div className='p-4 border-2 border-dashed rounded-lg text-center'>
                  No facilities added yet. Click &quot;Add Facility&quot; to get started.
                </div>
              ) : (
                <div className='flex flex-wrap gap-4'>
                  {facilitiesFields.map((field, index) => (
                    <div
                      key={field.id}
                      className='flex-1 space-y-3 p-4 border border-border rounded-lg min-w-full sm:min-w-[45%]'
                    >
                      <div className='flex justify-between items-center'>
                        <h4 className='font-medium text-sm'>Facility {index + 1}</h4>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          onClick={() => removeFacility(index)}
                          className='hover:bg-red-50 hover:text-red-700'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>

                      <div className='gap-3 grid grid-cols-1 lg:grid-cols-2'>
                        <Controller
                          control={control}
                          name={`whyChoose.facilities.${index}.title`}
                          render={({ field }) => (
                            <CustomInput
                              label='Title'
                              placeholder='Enter facility title'
                              error={errors.whyChoose?.facilities?.[index]?.title?.message}
                              {...field}
                              value={field.value ?? ''}
                            />
                          )}
                        />

                        <Controller
                          control={control}
                          name={`whyChoose.facilities.${index}.icon`}
                          render={({ field }) => (
                            <div className='space-y-2'>
                              <Label>Icon</Label>
                              <IconPickerModal {...field} />
                              {errors.whyChoose?.facilities?.[index]?.icon && (
                                <span className='text-red-500 text-xs'>
                                  {errors.whyChoose?.facilities?.[index]?.icon?.message}
                                </span>
                              )}
                            </div>
                          )}
                        />
                      </div>

                      <Controller
                        control={control}
                        name={`whyChoose.facilities.${index}.desc`}
                        render={({ field }) => (
                          <CustomInput
                            label='Description'
                            type='textarea'
                            rows={2}
                            placeholder='Enter facility description'
                            error={errors.whyChoose?.facilities?.[index]?.desc?.message}
                            {...field}
                            value={field.value ?? ''}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='howToWorks.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter how it works title'
                  error={errors.howToWorks?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='howToWorks.subTitle'
              render={({ field }) => (
                <CustomInput
                  label='Sub Title'
                  placeholder='Enter how it works subtitle'
                  error={errors.howToWorks?.subTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='howToWorks.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Describe the process'
                  error={errors.howToWorks?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <div className='space-y-2 lg:col-span-2'>
              <div className='flex justify-between items-center'>
                <label className='font-medium text-sm'>Steps</label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => appendHowTo({ title: '', desc: '', icon: '' })}
                  className='flex items-center gap-2'
                >
                  <Plus className='w-4 h-4' />
                  Add Step
                </Button>
              </div>

              {howToFields.length === 0 ? (
                <div className='p-4 border-2 border-dashed rounded-lg text-center'>
                  No steps added yet. Click &quot;Add Step&quot; to get started.
                </div>
              ) : (
                <div className='flex flex-wrap gap-4'>
                  {howToFields.map((field, index) => (
                    <div
                      key={field.id}
                      className='flex-1 space-y-3 p-4 border border-border rounded-lg min-w-full sm:min-w-[45%]'
                    >
                      <div className='flex justify-between items-center'>
                        <h4 className='font-medium text-sm'>Step {index + 1}</h4>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          onClick={() => removeHowTo(index)}
                          className='hover:bg-red-50 hover:text-red-700'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>

                      <div className='gap-3 grid grid-cols-1 lg:grid-cols-2'>
                        <Controller
                          control={control}
                          name={`howToWorks.facilities.${index}.title`}
                          render={({ field }) => (
                            <CustomInput
                              label='Title'
                              placeholder='Enter step title'
                              error={errors.howToWorks?.facilities?.[index]?.title?.message}
                              {...field}
                              value={field.value ?? ''}
                            />
                          )}
                        />

                        <Controller
                          control={control}
                          name={`howToWorks.facilities.${index}.icon`}
                          render={({ field }) => (
                            <div className='space-y-2'>
                              <Label>Icon</Label>
                              <IconPickerModal {...field} />
                              {errors.howToWorks?.facilities?.[index]?.icon && (
                                <span className='text-red-500 text-xs'>
                                  {errors.howToWorks?.facilities?.[index]?.icon?.message}
                                </span>
                              )}
                            </div>
                          )}
                        />
                      </div>

                      <Controller
                        control={control}
                        name={`howToWorks.facilities.${index}.desc`}
                        render={({ field }) => (
                          <CustomInput
                            label='Description'
                            type='textarea'
                            rows={2}
                            placeholder='Enter step description'
                            error={errors.howToWorks?.facilities?.[index]?.desc?.message}
                            {...field}
                            value={field.value ?? ''}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offers Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='offers.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter offers title'
                  error={errors.offers?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='offers.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Enter offers description'
                  error={errors.offers?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='about.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter about title'
                  error={errors.about?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='about.subTitle'
              render={({ field }) => (
                <CustomInput
                  label='Sub Title'
                  placeholder='Enter about subtitle'
                  error={errors.about?.subTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='about.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Enter about description'
                  error={errors.about?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <div className=''>
              <label className='font-medium text-sm'>Image</label>
              <Controller
                control={control}
                name='about.image'
                render={({ field }) => (
                  <FileUploader value={field.value || ''} onChangeAction={field.onChange} />
                )}
              />
              {errors.about?.image && (
                <span className='text-red-500 text-xs'>{errors.about.image.message}</span>
              )}
            </div>

            <div className='space-y-2 lg:col-span-2'>
              <div className='flex justify-between items-center'>
                <label className='font-medium text-sm'>Statistics</label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => appendStatistic({ title: '', count: '' })}
                  className='flex items-center gap-2'
                >
                  <Plus className='w-4 h-4' />
                  Add Statistic
                </Button>
              </div>

              {statisticsFields.length === 0 ? (
                <div className='p-4 border-2 border-dashed rounded-lg text-center'>
                  No statistics added yet. Click &quot;Add Statistic&quot; to get started.
                </div>
              ) : (
                <div className='flex flex-wrap gap-4'>
                  {statisticsFields.map((field, index) => (
                    <div
                      key={field.id}
                      className='flex-1 space-y-3 p-4 border rounded-lg min-w-full sm:min-w-[45%] lg:min-w-[24%]'
                    >
                      <div className='flex justify-between items-center'>
                        <h4 className='font-medium text-sm'>Statistic {index + 1}</h4>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          onClick={() => removeStatistic(index)}
                          className='hover:bg-red-50 hover:text-red-700'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>

                      <div className='gap-3 grid grid-cols-1 lg:grid-cols-2'>
                        <Controller
                          control={control}
                          name={`about.stats.${index}.title`}
                          render={({ field }) => (
                            <CustomInput
                              label='Title'
                              placeholder='Enter statistic title'
                              error={errors.about?.stats?.[index]?.title?.message}
                              {...field}
                              value={field.value ?? ''}
                            />
                          )}
                        />

                        <Controller
                          control={control}
                          name={`about.stats.${index}.count`}
                          render={({ field }) => (
                            <CustomInput
                              label='Count'
                              placeholder='Enter count (e.g., 1000+, 50K)'
                              error={errors.about?.stats?.[index]?.count?.message}
                              {...field}
                              value={field.value ?? ''}
                            />
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='categories.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter categories title'
                  error={errors.categories?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='categories.subTitle'
              render={({ field }) => (
                <CustomInput
                  label='Sub Title'
                  placeholder='Enter categories subtitle'
                  error={errors.categories?.subTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='categories.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Enter categories description'
                  error={errors.categories?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='feedback.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter feedback title'
                  error={errors.feedback?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='feedback.subTitle'
              render={({ field }) => (
                <CustomInput
                  label='Sub Title'
                  placeholder='Enter feedback sub title'
                  error={errors.feedback?.subTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='feedback.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Enter feedback description'
                  error={errors.feedback?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='platform.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter platform title'
                  error={errors.platform?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='platform.subTitle'
              render={({ field }) => (
                <CustomInput
                  label='Sub Title'
                  placeholder='Enter platform subtitle'
                  error={errors.platform?.subTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='platform.desc'
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  rows={3}
                  placeholder='Enter platform description'
                  error={errors.platform?.desc?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscribe Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='subscribe.title'
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  placeholder='Enter subscribe title'
                  error={errors.subscribe?.title?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='subscribe.subTitle'
              render={({ field }) => (
                <CustomInput
                  label='Sub Title'
                  placeholder='Enter subscribe subtitle'
                  error={errors.subscribe?.subTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Button type='submit' size={'lg'}>
        {isSubmitting ? 'Submitting...' : initialValues ? 'Update Settings' : 'Save Settings'}
      </Button>
    </form>
  )
}

export default HomepageSettings
