import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

/** Giá trị phải trùng với field khác, ví dụ `@Match('password')` cho confirmPassword */
export function Match(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [related] = args.constraints as [string];
          return value === (args.object as Record<string, unknown>)[related];
        },
      },
    });
  };
}
