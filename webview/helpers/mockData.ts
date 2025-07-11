import { faker } from '@faker-js/faker';

/**
 * Generates a fake child object.
 * @returns A child object with a name and age.
 */
const createChild = () => ({
  name: faker.person.firstName(),
  age: faker.number.int({ min: 1, max: 18 }),
});

/**
 * Generates dynamic sample data for development and testing.
 * This function creates a structured JSON object with realistic, randomized data.
 *
 * @param {object} [options] - Options to customize the generated data.
 * @param {number} [options.childrenCount] - The number of children to generate for the person. Defaults to a random number between 0 and 5.
 * @returns A structured JSON object for visualization.
 */
export const createSampleJsonData = (options?: { childrenCount?: number }) => {
  const childrenCount =
    options?.childrenCount ?? faker.number.int({ min: 0, max: 5 });

  return {
    person: {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      age: faker.number.int({ min: 18, max: 80 }),
      married: faker.datatype.boolean(),
      avatar: faker.image.avatar(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        zipCode: faker.location.zipCode(),
      },
      children: faker.helpers.multiple(createChild, {
        count: childrenCount,
      }),
    },
    company: {
      name: faker.company.name(),
      catchPhrase: faker.company.catchPhrase(),
    },
    lastLogin: faker.date.recent().toISOString(),
    active: faker.datatype.boolean(),
  };
};

/**
 * A default sample data export for simple, out-of-the-box usage in components.
 * This ensures that components requiring mock data don't break if they are not
 * updated to use the generator function immediately.
 */
export const sampleJsonData = createSampleJsonData();
