import { nanoSec, validateSec } from '@/utils/string'

export const SITE_CONFIG = '/settings/system_site_settings'
export const HOME_CONFIG = '/settings/home_settings'
export const MAIN_MENUS = '/admin/settings/main_menus'
export const FOOTER_MENUS = '/admin/settings/footer_menus'
export const CACHE_REV = nanoSec * 4 // in nano seconds
export const TOVALIDATE = validateSec * 2 // in nano seconds
