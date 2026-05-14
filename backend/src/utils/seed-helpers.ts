// Utility functions for database seeding

/**
 * Generate random string using Math.random and substring
 * @param length - Length of the random string to generate
 * @returns Random string
 */
export const generateRandomString = (length: number): string => {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
};

/**
 * Generate random email address
 * @returns Random email address
 */
export const generateRandomEmail = (): string => {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com'];
  const username = generateRandomString(8).toLowerCase();
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${username}@${domain}`;
};

/**
 * Generate mock encrypted account data
 * @returns Object with encrypted-like account data
 */
export const generateEncryptedAccountData = () => {
  return {
    username: `encrypted_${generateRandomString(16)}`,
    password: `encrypted_${generateRandomString(24)}`,
    email: `encrypted_${generateRandomEmail()}`,
    additionalData: {
      phoneNumber: `encrypted_${generateRandomString(12)}`,
      recoveryEmail: `encrypted_${generateRandomEmail()}`,
      created: new Date().toISOString(),
    },
  };
};

/**
 * Generate random phone number
 * @returns Random phone number string
 */
export const generateRandomPhone = (): string => {
  const areaCodes = ['555', '123', '456', '789', '321'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const number = generateRandomString(7).replace(/[a-zA-Z]/g, () =>
    Math.floor(Math.random() * 10).toString()
  );
  return `+1${areaCode}${number}`;
};

/**
 * Generate random price within a range
 * @param min - Minimum price
 * @param max - Maximum price
 * @returns Random price with 2 decimal places
 */
export const generateRandomPrice = (min: number, max: number): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

/**
 * Generate random date within a range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Random date between start and end
 */
export const generateRandomDate = (startDate: Date, endDate: Date): Date => {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
};

/**
 * Pick random item from array
 * @param array - Array to pick from
 * @returns Random item from array
 */
export const pickRandom = <T>(array: T[]): T => {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  return array[Math.floor(Math.random() * array.length)]!;
};

/**
 * Generate random boolean with probability
 * @param probability - Probability of true (0-1)
 * @returns Random boolean
 */
export const randomBoolean = (probability: number = 0.5): boolean => {
  return Math.random() < probability;
};

/**
 * Generate random integer between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
