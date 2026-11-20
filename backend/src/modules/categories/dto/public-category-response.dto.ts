export class PublicCategoryDto {
  id!: number;
  name!: string;
  slug!: string;
  postCount!: number;
}

export class PublicCategoryTranslationDto {
  code!: string;
  slug!: string;
}

export class PublicCategoryDetailDto extends PublicCategoryDto {
  translations!: PublicCategoryTranslationDto[];
}
