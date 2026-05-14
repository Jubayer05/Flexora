import { CacheToCheck } from '@/types/auth-settings'

export const generateRandomNumber = (n: number = 6) => {
  return Math.floor(Math.random() * 10 ** n)
}

export const generateRandomString = (n: number = 6) => {
  return Math.random()
    .toString(36)
    .substring(2, n + 2)
    .toUpperCase()
}

export const nanoSec = 881755200000
export const validateSec = 10368000000 / 2
export const needvalidate = CacheToCheck
